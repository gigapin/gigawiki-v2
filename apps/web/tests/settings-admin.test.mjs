// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { PasswordPage } from '../src/pages/settings/PasswordPage'
import { AppearancePage } from '../src/pages/settings/AppearancePage'
import { UsersPage } from '../src/pages/settings/UsersPage'
import { AppSettingsPage } from '../src/pages/settings/AppSettingsPage'
import { InviteList } from '../src/pages/settings/InviteList'
import { SettingsLayout } from '../src/pages/settings/SettingsLayout'
import { SiteName } from '../src/components/shared/SiteName'
import { useAuthStore } from '../src/stores/auth.store'
import { useThemeStore } from '../src/stores/theme.store'
import { useSettingsStore } from '../src/stores/settings.store'
import apiClient from '../src/api/client'
const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({ children, to }) => createElement('a', { href: to }, children),
  Outlet: () => null,
}))
vi.mock('../src/api/client', () => ({
  default: { get: vi.fn(), patch: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))
const admin = {
  id: 'admin',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  createdAt: '2026-01-01',
}
const other = {
  id: 'other',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'GUEST',
  createdAt: '2026-01-01',
}
const invite = {
  id: 'invite',
  email: 'invited@example.com',
  role: 'GUEST',
  expiresAt: '2025-01-01',
}
const preview = {
  user: other,
  fingerprint: 'a'.repeat(64),
  counts: { pages: 2, transferredProjects: 1 },
}
const failure = (status, error) =>
  new AxiosError(error, 'ERROR', undefined, undefined, { status, data: { error } })
let client
beforeEach(() => {
  vi.resetAllMocks()
  useAuthStore.setState({ user: admin, accessToken: 'token' })
  useSettingsStore.setState({ settings: {} })
  useThemeStore.getState().setTheme('dark')
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  apiClient.get.mockImplementation(async (url) => ({
    data: url.includes('deletion-preview')
      ? preview
      : url.endsWith('/invites')
        ? { invites: [invite], total: 1, limit: 20 }
        : url.endsWith('/settings')
          ? { SITE_NAME: 'GiGaWiki', DEFAULT_USER_ROLE: 'GUEST', ALLOW_SELF_REGISTRATION: 'true' }
          : { users: [admin, other], total: 2, limit: 20 },
  }))
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  client.clear()
})
function mount(Component) {
  render(createElement(QueryClientProvider, { client }, createElement(Component)))
}
async function fillPasswords() {
  await userEvent.type(screen.getByLabelText('Current password'), 'oldpassword')
  await userEvent.type(screen.getByLabelText('New password'), 'newpassword')
  await userEvent.type(screen.getByLabelText('Confirm password'), 'newpassword')
}
it('validates password confirmation and offers visibility', async () => {
  mount(PasswordPage)
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
  expect(screen.getByRole('alert').textContent).toContain('current password')
  await fillPasswords()
  await userEvent.clear(screen.getByLabelText('Confirm password'))
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
  expect(screen.getByRole('alert').textContent).toContain('do not match')
  expect(apiClient.patch).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Show passwords' }))
  expect(screen.getByLabelText('New password').type).toBe('text')
})
it('revokes the local session and returns to login after a successful password change', async () => {
  apiClient.patch.mockResolvedValue({ data: { message: 'Changed' } })
  mount(PasswordPage)
  await fillPasswords()
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith({
      to: '/login',
      search: { redirect: '', passwordChanged: true },
    }),
  )
  expect(useAuthStore.getState().user).toBeNull()
  expect(useAuthStore.getState().accessToken).toBeNull()
  expect(apiClient.patch).toHaveBeenCalledWith('/api/v2/users/me', {
    currentPassword: 'oldpassword',
    newPassword: 'newpassword',
  })
})
it('keeps the session and permits retry after an incorrect current password', async () => {
  apiClient.patch.mockRejectedValue(failure(400, 'Current password is incorrect.'))
  mount(PasswordPage)
  await fillPasswords()
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
  expect((await screen.findByRole('alert')).textContent).toContain('incorrect')
  expect(useAuthStore.getState().user.id).toBe('admin')
  expect(screen.getByLabelText('Current password').value).toBe('oldpassword')
})
it('changes the shared theme immediately and persists it locally', async () => {
  mount(AppearancePage)
  await userEvent.click(screen.getByRole('radio', { name: 'Light' }))
  expect(useThemeStore.getState().theme).toBe('light')
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('gigawiki-theme')).toBe('light')
})
it('shows all Settings links only to the appropriate role', () => {
  useAuthStore.setState({ user: other })
  mount(SettingsLayout)
  expect(screen.getByRole('link', { name: 'Password' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Appearance' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Users' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'App Settings' })).toBeNull()
})
it('loads users, searches and sends role updates', async () => {
  apiClient.patch.mockResolvedValue({ data: { ...other, role: 'EDITOR' } })
  mount(UsersPage)
  const select = await screen.findByLabelText('Role for Alice')
  await userEvent.selectOptions(select, 'EDITOR')
  await waitFor(() =>
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v2/users/other', { role: 'EDITOR' }),
  )
  await userEvent.type(screen.getByLabelText('Search users'), 'Alice')
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenCalledWith('/api/v2/users', {
      params: { page: 1, limit: 20, search: 'Alice' },
      signal: expect.any(AbortSignal),
    }),
  )
  expect(screen.getByRole('button', { name: 'Delete Admin' }).disabled).toBe(true)
})
it('requires a preview and confirmation before deleting user content', async () => {
  apiClient.delete.mockResolvedValue({})
  mount(UsersPage)
  await userEvent.click(await screen.findByRole('button', { name: 'Delete Alice' }))
  await screen.findByText(/Pages deleted: 2/i)
  expect(apiClient.delete).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(apiClient.delete).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Delete Alice' }))
  await screen.findByText(/Pages deleted: 2/i)
  await userEvent.click(screen.getByRole('button', { name: 'Delete account and content' }))
  await waitFor(() =>
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v2/users/other', {
      data: { fingerprint: preview.fingerprint },
    }),
  )
})
it('requires review of a fresh preview after a deletion conflict', async () => {
  apiClient.delete.mockRejectedValue(failure(409, 'Content changed. Review again.'))
  mount(UsersPage)
  await userEvent.click(await screen.findByRole('button', { name: 'Delete Alice' }))
  await screen.findByText(/Pages deleted: 2/i)
  await userEvent.click(screen.getByRole('button', { name: 'Delete account and content' }))
  await screen.findByRole('button', { name: 'Review new preview' })
  expect(screen.getByRole('button', { name: 'Delete account and content' }).disabled).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Review new preview' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Delete account and content' }).disabled).toBe(false),
  )
})
it('keeps a failed role change unchanged and exposes retryable errors', async () => {
  apiClient.patch.mockRejectedValue(failure(409, 'The last administrator cannot be demoted.'))
  mount(UsersPage)
  await userEvent.selectOptions(await screen.findByLabelText('Role for Admin'), 'GUEST')
  expect((await screen.findByRole('alert')).textContent).toContain('last administrator')
  expect(screen.getByLabelText('Role for Admin').value).toBe('ADMIN')
})
it('saves site name and updates shared branding without losing other settings', async () => {
  apiClient.put.mockImplementation(async (url, input) => ({
    data: { key: 'SITE_NAME', value: input.value },
  }))
  mount(AppSettingsPage)
  render(createElement(SiteName))
  const input = await screen.findByLabelText('Site name')
  await userEvent.clear(input)
  await userEvent.type(input, 'My Wiki')
  await userEvent.click(screen.getByRole('button', { name: 'Save site name' }))
  await waitFor(() => expect(useSettingsStore.getState().settings.SITE_NAME).toBe('My Wiki'))
  expect(apiClient.put).toHaveBeenCalledWith('/api/v2/settings/SITE_NAME', { value: 'My Wiki' })
  expect(useSettingsStore.getState().settings.DEFAULT_USER_ROLE).toBe('GUEST')
  expect(screen.getByText('My Wiki')).toBeTruthy()
})
it('retains settings values after a save error', async () => {
  apiClient.put.mockRejectedValue(failure(500, 'Unavailable'))
  mount(AppSettingsPage)
  const input = await screen.findByLabelText('Site name')
  await userEvent.clear(input)
  await userEvent.type(input, 'Retry Wiki')
  await userEvent.click(screen.getByRole('button', { name: 'Save site name' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Unavailable')
  expect(input.value).toBe('Retry Wiki')
})
it('resends an expired invitation and permits retry on delivery failure', async () => {
  apiClient.post
    .mockRejectedValueOnce(failure(503, 'Saved but email could not be queued.'))
    .mockResolvedValueOnce({ data: { message: 'Invitation email queued.' } })
  mount(InviteList)
  await userEvent.click(await screen.findByRole('button', { name: 'Resend' }))
  expect((await screen.findByRole('alert')).textContent).toContain('could not be queued')
  await userEvent.click(screen.getByRole('button', { name: 'Resend' }))
  await screen.findByText('Invitation email queued.')
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/users/invites/invite/resend')
})
it('cancels an invitation only after confirmation', async () => {
  apiClient.delete.mockResolvedValue({})
  mount(InviteList)
  await userEvent.click(await screen.findByRole('button', { name: 'Cancel invitation' }))
  expect(apiClient.delete).not.toHaveBeenCalled()
  const buttons = screen.getAllByRole('button', { name: 'Cancel invitation' })
  await userEvent.click(buttons[buttons.length - 1])
  await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/api/v2/users/invites/invite'))
})
it('does not expose Users actions to a Guest', () => {
  useAuthStore.setState({ user: other })
  mount(UsersPage)
  expect(screen.getByRole('alert').textContent).toContain('Admin access required')
  expect(screen.queryByRole('button', { name: 'Delete Alice' })).toBeNull()
})

it('loads another users page and resets pagination when searching', async () => {
  apiClient.get.mockResolvedValue({ data: { users: [admin, other], total: 25, limit: 20 } })
  mount(UsersPage)
  await userEvent.click(await screen.findByRole('button', { name: 'Next' }))
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenCalledWith('/api/v2/users', {
      params: { page: 2, limit: 20, search: '' },
      signal: expect.any(AbortSignal),
    }),
  )
  await userEvent.type(screen.getByLabelText('Search users'), 'Alice')
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenCalledWith('/api/v2/users', {
      params: { page: 1, limit: 20, search: 'Alice' },
      signal: expect.any(AbortSignal),
    }),
  )
})
it('loads another page of invitations', async () => {
  apiClient.get.mockResolvedValue({ data: { invites: [invite], total: 25, limit: 20 } })
  mount(InviteList)
  await userEvent.click(await screen.findByRole('button', { name: 'Next' }))
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenCalledWith('/api/v2/users/invites', {
      params: { page: 2, limit: 20 },
      signal: expect.any(AbortSignal),
    }),
  )
})
