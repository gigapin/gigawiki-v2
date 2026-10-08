import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RegisterPage } from '../src/pages/auth/RegisterPage'
import { VerifyEmailPage } from '../src/pages/auth/VerifyEmailPage'

const fixture = vi.hoisted(() => ({
  settings: { data: { ALLOW_SELF_REGISTRATION: 'true' }, isPending: false, isError: false },
  mutation: { isSuccess: false, isError: false, isPending: false, error: null },
  verification: { status: 'success', message: 'Email verified.' },
}))
vi.mock('../src/api/auth', () => ({
  useRegistrationSettings: () => fixture.settings,
  useRegister: () => fixture.mutation,
  useResendVerification: () => ({ isPending: false, isError: false, isSuccess: false }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search: _search, ...props }) =>
    createElement('a', { href: to, ...props }, children),
  useLoaderData: () => fixture.verification,
}))

beforeEach(() => {
  fixture.settings = { data: { ALLOW_SELF_REGISTRATION: 'true' }, isPending: false, isError: false }
  fixture.mutation = { isSuccess: false, isError: false, isPending: false, error: null }
  fixture.verification = { status: 'success', message: 'Email verified.' }
})

it('shows all signup fields when registration is enabled', () => {
  const html = renderToStaticMarkup(createElement(RegisterPage))
  expect(html).toContain('register-name')
  expect(html).toContain('register-email')
  expect(html).toContain('register-password')
  expect(html).toContain('register-confirm')
  expect(html).toContain('Create account')
})

it('hides the form when registration is disabled', () => {
  fixture.settings.data.ALLOW_SELF_REGISTRATION = 'false'
  const html = renderToStaticMarkup(createElement(RegisterPage))
  expect(html).toContain('invite-only')
  expect(html).not.toContain('register-password')
})

it('shows the inbox confirmation and resend option after signup', () => {
  fixture.mutation.isSuccess = true
  const html = renderToStaticMarkup(createElement(RegisterPage))
  expect(html).toContain('Check your inbox')
  expect(html).toContain('Resend verification email')
  expect(html).not.toContain('register-password')
})

it('links verified users to sign-in', () => {
  const html = renderToStaticMarkup(createElement(VerifyEmailPage))
  expect(html).toContain('Email verified')
  expect(html).toContain('Continue to sign in')
  expect(html).not.toContain('resend-email')
})

it('offers resend for invalid or expired verification links', () => {
  fixture.verification = { status: 'error', message: 'Invalid or expired verification token' }
  const html = renderToStaticMarkup(createElement(VerifyEmailPage))
  expect(html).toContain('Invalid or expired verification token')
  expect(html).toContain('resend-email')
})
