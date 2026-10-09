// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import axios from 'axios'
import { ForgotPasswordPage } from '../src/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../src/pages/auth/ResetPasswordPage'
import { AcceptInvitePage } from '../src/pages/auth/AcceptInvitePage'
import apiClient from '../src/api/client'
const fixture = vi.hoisted(() => ({ token: 'valid-token', navigate: vi.fn(), setAuth: vi.fn() }))
vi.mock('../src/api/client', () => ({ default: { post: vi.fn() } }))
vi.mock('axios', async (original) => ({ ...(await original()), default: { get: vi.fn() } }))
vi.mock('../src/stores/auth.store', () => ({
  useAuthStore: (selector) => selector({ setAuth: fixture.setAuth }),
}))
vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({ token: fixture.token }),
  useNavigate: () => fixture.navigate,
  Link: ({ children, to, search: _search, ...props }) =>
    createElement('a', { href: to, ...props }, children),
}))
let client
beforeEach(() => {
  vi.clearAllMocks()
  fixture.token = 'valid-token'
  apiClient.post.mockResolvedValue({ data: { message: 'Done', accessToken: 'new-token' } })
  axios.get.mockResolvedValue({ data: { user: { id: 'invited', name: 'Alice', role: 'EDITOR' } } })
})
afterEach(() => {
  cleanup()
  client.clear()
})
function mount(Component) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(createElement(QueryClientProvider, { client }, createElement(Component)))
}
function failure(message, status = 400) {
  return new AxiosError(message, undefined, undefined, undefined, {
    status,
    data: { error: message },
  })
}
async function password(value = 'password123', confirm = value) {
  await userEvent.type(screen.getByLabelText('New password'), value)
  await userEvent.type(screen.getByLabelText('Confirm password'), confirm)
}
it('validates recovery email, normalizes it and shows a neutral confirmation', async () => {
  mount(ForgotPasswordPage)
  await userEvent.type(screen.getByLabelText('Email'), 'invalid')
  await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
  expect(apiClient.post).not.toHaveBeenCalled()
  expect(screen.getByText('Enter a valid email address.')).toBeTruthy()
  await userEvent.clear(screen.getByLabelText('Email'))
  await userEvent.type(screen.getByLabelText('Email'), ' Alice@Example.com ')
  await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
  await screen.findByRole('status')
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/auth/forgot-password', {
    email: 'alice@example.com',
  })
  expect(screen.getByText('If that email is registered, a reset link has been sent.')).toBeTruthy()
})
it('keeps recovery failures visible and supports retry', async () => {
  apiClient.post.mockRejectedValueOnce(failure('Too many requests', 429))
  mount(ForgotPasswordPage)
  await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Too many requests')
  await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
  await screen.findByRole('status')
})
it.each([ResetPasswordPage, AcceptInvitePage])(
  'does not submit a missing token',
  async (Component) => {
    fixture.token = ''
    mount(Component)
    expect(screen.getByRole('alert').textContent).toContain('missing a token')
    expect(screen.queryByLabelText('New password')).toBeNull()
    expect(apiClient.post).not.toHaveBeenCalled()
  },
)
it('validates password length and confirmation before resetting, then links to login', async () => {
  mount(ResetPasswordPage)
  await password('short', 'different')
  await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))
  expect(apiClient.post).not.toHaveBeenCalled()
  expect(screen.getByText('Passwords do not match.')).toBeTruthy()
  await userEvent.clear(screen.getByLabelText('New password'))
  await userEvent.clear(screen.getByLabelText('Confirm password'))
  await password()
  await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))
  await screen.findByRole('status')
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/auth/reset-password', {
    token: 'valid-token',
    newPassword: 'password123',
  })
  expect(screen.getByRole('link', { name: 'Continue to sign in' }).getAttribute('href')).toBe(
    '/login',
  )
  expect(screen.queryByLabelText('New password')).toBeNull()
})
it('handles expired reset tokens and offers a new link without losing the draft', async () => {
  apiClient.post.mockRejectedValue(failure('Invalid or expired reset token'))
  mount(ResetPasswordPage)
  await password()
  await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))
  expect((await screen.findByRole('alert')).textContent).toContain('expired')
  expect(screen.getByLabelText('New password').value).toBe('password123')
  expect(screen.getByRole('link', { name: 'Request a new reset link' }).getAttribute('href')).toBe(
    '/forgot-password',
  )
})
it('blocks repeat submission while waiting and supports password visibility', async () => {
  apiClient.post.mockImplementation(() => new Promise(() => {}))
  mount(ResetPasswordPage)
  await password()
  await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
  expect(screen.getByLabelText('New password').type).toBe('text')
  await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))
  expect(screen.getByRole('button', { name: 'Saving…' }).disabled).toBe(true)
  expect(screen.getByLabelText('New password').matches(':disabled')).toBe(true)
  expect(apiClient.post).toHaveBeenCalledTimes(1)
})
it('accepts an invite and installs the invited session after fetching its profile', async () => {
  mount(AcceptInvitePage)
  client.setQueryData(['favorites'], ['previous-account'])
  await userEvent.type(screen.getByLabelText('Name'), ' Alice ')
  await password()
  await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }))
  await waitFor(() => expect(fixture.navigate).toHaveBeenCalledWith({ to: '/' }))
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/auth/accept-invite', {
    token: 'valid-token',
    name: 'Alice',
    password: 'password123',
  })
  expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/v2/auth/me'), {
    headers: { Authorization: 'Bearer new-token' },
    withCredentials: true,
  })
  expect(fixture.setAuth).toHaveBeenCalledWith(
    { id: 'invited', name: 'Alice', role: 'EDITOR' },
    'new-token',
  )
  expect(client.getQueryData(['favorites'])).toBeUndefined()
})
it('retries profile loading after an accepted invitation without submitting it twice', async () => {
  axios.get.mockRejectedValueOnce(failure('Profile unavailable', 503))
  mount(AcceptInvitePage)
  await userEvent.type(screen.getByLabelText('Name'), 'Alice')
  await password()
  await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }))
  await screen.findByRole('alert')
  expect(screen.queryByRole('button', { name: 'Accept invitation' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Continue to GigaWiki' }))
  await waitFor(() => expect(fixture.setAuth).toHaveBeenCalled())
  expect(apiClient.post).toHaveBeenCalledTimes(1)
})
it('shows expired invitations with administrator guidance', async () => {
  apiClient.post.mockRejectedValue(failure('Invite expired'))
  mount(AcceptInvitePage)
  await userEvent.type(screen.getByLabelText('Name'), 'Alice')
  await password()
  await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }))
  expect((await screen.findByRole('alert')).textContent).toContain('administrator')
  expect(fixture.setAuth).not.toHaveBeenCalled()
})

it('requires a name before accepting an invitation', async () => {
  mount(AcceptInvitePage)
  await password()
  await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }))
  expect(screen.getByText('Enter a name of 1–100 characters.')).toBeTruthy()
  expect(apiClient.post).not.toHaveBeenCalled()
})
