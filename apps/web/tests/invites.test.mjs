// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { InvitesPage } from '../src/pages/settings/InvitesPage'
import { InviteUsersLink } from '../src/components/auth/InviteUsersLink'
import apiClient from '../src/api/client'
const session = vi.hoisted(() => ({ user: { role: 'ADMIN' } }))
vi.mock('../src/stores/auth.store', () => ({ useAuthStore: (selector) => selector(session) }))
vi.mock('../src/api/client', () => ({ default: { post: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }) => createElement('a', { href: to, ...props }, children),
}))
let client
beforeEach(() => {
  vi.clearAllMocks()
  session.user = { role: 'ADMIN' }
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.scrollIntoView = vi.fn()
  apiClient.post.mockResolvedValue({
    data: { invite: { id: 'i', email: 'alice@example.com', role: 'GUEST' } },
  })
})
afterEach(() => {
  cleanup()
  client?.clear()
})
function mount() {
  client = new QueryClient()
  render(createElement(QueryClientProvider, { client }, createElement(InvitesPage)))
}
async function fill() {
  await userEvent.type(screen.getByLabelText('Email'), ' Alice@Example.com ')
}
it.each(['GUEST', 'EDITOR'])('hides navigation and prevents submissions for %s', (role) => {
  session.user.role = role
  render(createElement(InviteUsersLink))
  expect(screen.queryByRole('link', { name: 'Invite users' })).toBeNull()
  mount()
  expect(screen.getByRole('alert').textContent).toContain('administrators')
  expect(screen.queryByRole('button', { name: 'Send invitation' })).toBeNull()
  expect(apiClient.post).not.toHaveBeenCalled()
})
it('links administrators to invitations and closes the menu', async () => {
  const onClick = vi.fn()
  render(createElement(InviteUsersLink, { onClick }))
  const link = screen.getByRole('link', { name: 'Invite users' })
  expect(link.getAttribute('href')).toBe('/settings/invites')
  await userEvent.click(link)
  expect(onClick).toHaveBeenCalled()
})
it('validates inputs, sends normalized data and allows another invitation', async () => {
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
  expect(apiClient.post).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true')
  expect(screen.queryByLabelText('Name')).toBeNull()
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
  expect((await screen.findByRole('status')).textContent).toContain('alice@example.com')
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/users/invite', {
    email: 'alice@example.com',
    role: 'GUEST',
  })
  await userEvent.click(screen.getByRole('button', { name: 'Invite another user' }))
  expect(screen.getByLabelText('Email').value).toBe('')
})
it('sends the selected editor role', async () => {
  apiClient.post.mockResolvedValue({
    data: { invite: { email: 'alice@example.com', role: 'EDITOR' } },
  })
  mount()
  await fill()
  await userEvent.click(screen.getByRole('combobox', { name: 'Role' }))
  await userEvent.click(await screen.findByRole('option', { name: 'Editor' }))
  await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
  await screen.findByRole('status')
  expect(apiClient.post).toHaveBeenCalledWith(
    '/api/v2/users/invite',
    expect.objectContaining({ role: 'EDITOR' }),
  )
})
it('preserves fields after conflicts and allows retry', async () => {
  apiClient.post.mockRejectedValueOnce(
    new AxiosError('Conflict', undefined, undefined, undefined, {
      status: 409,
      data: { error: 'Email is already registered' },
    }),
  )
  mount()
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
  expect((await screen.findByRole('alert')).textContent).toContain('already registered')
  expect(screen.getByLabelText('Email').value).toContain('Alice@Example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
  await screen.findByRole('status')
})
it('prevents duplicate creation when the invitation is saved but email delivery fails', async () => {
  apiClient.post.mockRejectedValue(
    new AxiosError('Queue error', undefined, undefined, undefined, {
      status: 503,
      data: { code: 'INVITE_DELIVERY_FAILED', error: 'Saved but not queued' },
    }),
  )
  mount()
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
  expect((await screen.findByRole('alert')).textContent).toContain('invitation was saved')
  expect(screen.queryByRole('button', { name: 'Send invitation' })).toBeNull()
  expect(apiClient.post).toHaveBeenCalledTimes(1)
})
it('blocks repeated submits while the invitation is being queued', async () => {
  apiClient.post.mockImplementation(() => new Promise(() => {}))
  mount()
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Sending invitation…' }).disabled).toBe(true),
  )
  expect(screen.getByLabelText('Email').matches(':disabled')).toBe(true)
  expect(apiClient.post).toHaveBeenCalledTimes(1)
})
