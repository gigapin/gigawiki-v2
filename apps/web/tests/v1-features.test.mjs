// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FavoritesPage, TagsPage } from '../src/pages/LibraryPages'
import { RecycleBinPage } from '../src/pages/settings/RecycleBinPage'
import { InitialPasswordPage } from '../src/pages/auth/InitialPasswordPage'
import { ProvisionAccount } from '../src/components/settings/ProvisionAccount'
import { ResourceFields } from '../src/components/shared/ResourceFields'
import { useInitialPasswordStore } from '../src/stores/initial-password.store'
import { useAuthStore } from '../src/stores/auth.store'
import { useLogin } from '../src/api/auth'
import apiClient from '../src/api/client'

const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }) =>
    createElement('a', { href: to, onClick: props.onClick }, children),
  useNavigate: () => navigate,
}))
vi.mock('../src/api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), request: vi.fn() } }))
let client
beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  useAuthStore.setState({ user: { id: 'admin', role: 'ADMIN' }, accessToken: 'session' })
  useInitialPasswordStore.getState().clear()
  apiClient.get.mockResolvedValue({ data: { favorites: [], tags: [], pages: [], total: 0 } })
  apiClient.request.mockResolvedValue({ data: {} })
})
afterEach(() => {
  cleanup()
  client.clear()
  useInitialPasswordStore.getState().clear()
})
function mount(Component, props = {}) {
  return render(createElement(QueryClientProvider, { client }, createElement(Component, props)))
}

it('paginates beyond six favorites and removes the selected association', async () => {
  apiClient.get.mockImplementation(async (_url, { params }) => ({
    data: {
      favorites: [
        { id: 'fav', pageId: 'p', page: { id: 'p', slug: 'wiki', title: `Page ${params.page}` } },
      ],
      total: 21,
    },
  }))
  mount(FavoritesPage)
  await screen.findByText('Page 1')
  await userEvent.click(screen.getByRole('button', { name: /Next/ }))
  await screen.findByText('Page 2')
  await userEvent.click(screen.getByRole('button', { name: 'Remove favorite' }))
  await waitFor(() =>
    expect(apiClient.request).toHaveBeenCalledWith({
      url: '/api/v2/favorites',
      method: 'post',
      data: { pageId: 'p' },
    }),
  )
})
it('shows the authorized tag catalog and counts', async () => {
  apiClient.get.mockResolvedValue({ data: { tags: [{ name: 'wiki', count: 3 }], total: 1 } })
  mount(TagsPage)
  expect((await screen.findByText('wiki')).tagName).toBe('A')
  expect(screen.getByText('3 resources')).toBeTruthy()
})
it('requires confirmation to restore and retains errors for retry', async () => {
  apiClient.get.mockResolvedValue({
    data: {
      pages: [
        {
          id: 'p',
          title: 'Deleted page',
          deletedAt: new Date().toISOString(),
          section: { title: 'Section', project: { name: 'Project' } },
        },
      ],
      total: 1,
    },
  })
  apiClient.request.mockRejectedValueOnce(new Error('Restore the deleted ancestors first'))
  mount(RecycleBinPage)
  await userEvent.click(await screen.findByRole('button', { name: 'Restore' }))
  expect(apiClient.request).not.toHaveBeenCalled()
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByRole('dialog')).toBeTruthy()
})
it('creates credentials only after explicit Admin attestation and clears the one-time display', async () => {
  apiClient.request.mockResolvedValue({
    data: {
      temporaryPassword: 'one-time-secret',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  })
  mount(ProvisionAccount)
  await userEvent.click(screen.getByText('Create account without email'))
  expect(screen.getByRole('button', { name: 'Create account' }).disabled).toBe(true)
  await userEvent.type(screen.getByLabelText('Account name'), 'New user')
  await userEvent.type(screen.getByLabelText('Account email'), 'new@example.invalid')
  await userEvent.click(screen.getByRole('checkbox'))
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
  await screen.findByText('one-time-secret')
  await userEvent.click(screen.getByText('I saved the password'))
  expect(screen.queryByText('one-time-secret')).toBeNull()
})
it('keeps challenge login out of the regular session and requires an explicit password change', async () => {
  apiClient.post.mockResolvedValue({
    data: { requiresPasswordChange: true, passwordChangeToken: 'challenge' },
  })
  function LoginProbe() {
    const login = useLogin()
    return createElement(
      'button',
      { onClick: () => login.mutate({ email: 'user@example.invalid', password: 'temporary' }) },
      'Sign in',
    )
  }
  mount(LoginProbe)
  await userEvent.click(screen.getByText('Sign in'))
  await waitFor(() => expect(useInitialPasswordStore.getState().token).toBe('challenge'))
  expect(useAuthStore.getState().accessToken).toBeNull()
  expect(apiClient.get).not.toHaveBeenCalled()
  cleanup()
  mount(InitialPasswordPage)
  await userEvent.type(screen.getByLabelText('New password'), 'User-password-123')
  await userEvent.type(screen.getByLabelText('Confirm password'), 'User-password-123')
  apiClient.post.mockResolvedValueOnce({ data: { message: 'Changed' } })
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith({
      to: '/login',
      search: { redirect: '', passwordChanged: true },
    }),
  )
  expect(useInitialPasswordStore.getState().token).toBeNull()
})
it('does not reinterpret existing plain descriptions as HTML', () => {
  mount(ResourceFields, {
    id: 'plain',
    values: { name: 'Resource', description: '<b>literal</b>', visibility: 'PUBLIC' },
    disabled: false,
    onChange: vi.fn(),
  })
  expect(screen.getByLabelText('Description').value).toBe('<b>literal</b>')
})
