// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { LoginPage } from '../src/pages/LoginPage'
import { useAuthStore } from '../src/stores/auth.store'
import apiClient from '../src/api/client'
const route = vi.hoisted(() => ({ navigate: vi.fn(), redirect: '' }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => route.navigate,
  useSearch: () => ({ redirect: route.redirect }),
  Link: ({ children, to }) => createElement('a', { href: to }, children),
}))
vi.mock('../src/api/client', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
let client
beforeEach(() => {
  vi.resetAllMocks()
  route.redirect = ''
  useAuthStore.setState({ user: null, accessToken: null })
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(createElement(QueryClientProvider, { client }, createElement(LoginPage)))
})
afterEach(() => {
  cleanup()
  client.clear()
})
async function submit() {
  await userEvent.type(screen.getByLabelText('Email'), 'Alice@example.com')
  await userEvent.type(screen.getByLabelText('Password'), 'password123')
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
}
it('validates required fields before sending login', async () => {
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
  expect(screen.getByText('Email is required.')).toBeTruthy()
  expect(screen.getByText('Password is required.')).toBeTruthy()
  expect(apiClient.post).not.toHaveBeenCalled()
})
it('displays 401 and retains inputs for retry', async () => {
  apiClient.post.mockRejectedValue(
    new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      data: { error: 'Invalid credentials' },
    }),
  )
  await submit()
  await screen.findByText('Invalid credentials')
  expect(screen.getByLabelText('Email').value).toBe('Alice@example.com')
  expect(route.navigate).not.toHaveBeenCalled()
})
it('establishes the session with the newly issued token and follows the requested redirect', async () => {
  route.redirect = '/subjects'
  const user = { id: 'alice', role: 'EDITOR', name: 'Alice' }
  apiClient.post.mockResolvedValue({ data: { accessToken: 'new-token' } })
  apiClient.get.mockResolvedValue({ data: { user } })
  await submit()
  await waitFor(() => expect(route.navigate).toHaveBeenCalledWith({ to: '/subjects' }))
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/auth/login', {
    email: 'alice@example.com',
    password: 'password123',
  })
  expect(apiClient.get).toHaveBeenCalledWith('/api/v2/auth/me', {
    headers: { Authorization: 'Bearer new-token' },
  })
  expect(useAuthStore.getState()).toMatchObject({ user, accessToken: 'new-token' })
})
it('opens the dashboard when no redirect is supplied', async () => {
  apiClient.post.mockResolvedValue({ data: { accessToken: 'token' } })
  apiClient.get.mockResolvedValue({ data: { user: { id: 'alice' } } })
  await submit()
  await waitFor(() => expect(route.navigate).toHaveBeenCalledWith({ to: '/' }))
})
