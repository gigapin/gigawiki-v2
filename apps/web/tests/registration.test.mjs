import { AxiosError } from 'axios'
import { validateRegistration, accountCreatedWithoutEmail } from '../src/lib/registration'
import { registerAccount, resendVerificationEmail, verifyEmailToken } from '../src/api/auth'
import apiClient from '../src/api/client'

vi.mock('../src/api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

const valid = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'password123',
  confirmPassword: 'password123',
}

it('validates the name, email, password and confirmation before submitting', () => {
  expect(validateRegistration(valid)).toEqual({})
  expect(
    validateRegistration({
      ...valid,
      name: ' ',
      email: 'invalid',
      password: 'short',
      confirmPassword: 'different',
    }),
  ).toMatchObject({
    name: expect.any(String),
    email: expect.any(String),
    password: expect.any(String),
    confirmPassword: 'Passwords do not match.',
  })
  expect(validateRegistration({ ...valid, password: 'a'.repeat(129) }).password).toBeTruthy()
})

it('accepts surrounding whitespace in the name and email', () => {
  expect(validateRegistration({ ...valid, name: ' Alice ', email: ' alice@example.com ' })).toEqual(
    {},
  )
})

it('submits registration using the API contract', async () => {
  const input = { name: valid.name, email: valid.email, password: valid.password }
  apiClient.post.mockResolvedValue({ data: { message: 'Registration successful' } })
  expect(await registerAccount(input)).toEqual({ message: 'Registration successful' })
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/auth/register', input)
})

it('supports resending verification for a pending account', async () => {
  apiClient.post.mockResolvedValue({
    data: { message: 'If this account needs verification, a new email has been sent.' },
  })
  await resendVerificationEmail(valid.email)
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/auth/resend-verification', {
    email: valid.email,
  })
})

it('verifies email with a POST and displays success', async () => {
  apiClient.post.mockResolvedValue({ data: { message: 'Email verified.' } })
  expect(await verifyEmailToken('test-token')).toEqual({
    status: 'success',
    message: 'Email verified.',
  })
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/auth/verify-email', { token: 'test-token' })
})

it('handles missing or expired tokens without reporting success', async () => {
  expect((await verifyEmailToken('')).status).toBe('error')
  expect(apiClient.post).not.toHaveBeenCalled()
  apiClient.post.mockRejectedValue(
    new AxiosError('Bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      data: { error: 'Invalid or expired verification token' },
    }),
  )
  expect(await verifyEmailToken('expired')).toEqual({
    status: 'error',
    message: 'Invalid or expired verification token',
  })
})

it('recognizes a created account when only email queueing failed', () => {
  const deliveryError = new AxiosError('Unavailable', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status: 503,
    data: { code: 'VERIFICATION_DELIVERY_FAILED' },
  })
  expect(accountCreatedWithoutEmail(deliveryError)).toBe(true)
  expect(accountCreatedWithoutEmail(new Error('Network failure'))).toBe(false)
})
