// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePage } from '../src/pages/settings/ProfilePage'
import { useAuthStore } from '../src/stores/auth.store'
import apiClient from '../src/api/client'
vi.mock('../src/api/client', () => ({ default: { patch: vi.fn(), post: vi.fn() } }))
const user = {
  id: 'one',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'GUEST',
  emailConfirmed: true,
}
let client
beforeEach(() => {
  vi.resetAllMocks()
  useAuthStore.setState({ user, accessToken: 'token' })
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  cleanup()
  client.clear()
})
function mount() {
  render(createElement(QueryClientProvider, { client }, createElement(ProfilePage)))
}
it('saves normalized profile and updates the session', async () => {
  apiClient.patch.mockResolvedValue({ data: { ...user, name: 'Bob' } })
  mount()
  await userEvent.clear(screen.getByLabelText('Name'))
  await userEvent.type(screen.getByLabelText('Name'), ' Bob ')
  await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  await screen.findByRole('status')
  expect(apiClient.patch).toHaveBeenCalledWith('/api/v2/users/me', {
    name: 'Bob',
    email: user.email,
  })
  expect(useAuthStore.getState().user.name).toBe('Bob')
})
it('preserves values on a save error and permits retry', async () => {
  apiClient.patch
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValueOnce({ data: user })
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  expect((await screen.findByRole('alert')).textContent).toContain('try again')
  expect(screen.getByLabelText('Email').value).toBe(user.email)
  await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  await screen.findByRole('status')
})
it('shows verification resend after an email change', async () => {
  apiClient.patch.mockResolvedValue({
    data: {
      ...user,
      email: 'new@example.com',
      emailConfirmed: false,
      verificationDeliveryFailed: true,
    },
  })
  mount()
  await userEvent.clear(screen.getByLabelText('Email'))
  await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  expect((await screen.findByRole('status')).textContent).toContain('could not be sent')
  expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeTruthy()
})
it('keeps a failed avatar selection for retry after saving profile', async () => {
  apiClient.patch.mockResolvedValue({ data: user })
  apiClient.post
    .mockRejectedValueOnce(new Error('Storage unavailable'))
    .mockResolvedValueOnce({ data: { ...user, avatar: { url: '/avatar.webp' } } })
  mount()
  await userEvent.upload(
    screen.getByLabelText('Avatar'),
    new File(['image'], 'avatar.png', { type: 'image/png' }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Profile saved. Avatar upload failed',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  await waitFor(() => expect(useAuthStore.getState().user.avatar?.url).toBe('/avatar.webp'))
  expect(URL.revokeObjectURL).toHaveBeenCalled()
})
