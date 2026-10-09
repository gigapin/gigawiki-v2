// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, act, cleanup, waitFor } from '@testing-library/react'
import { useAuthStore } from '../src/stores/auth.store'
import { bindSessionCache } from '../src/lib/session-cache'
import { useFavorites } from '../src/api/favorites'
import apiClient from '../src/api/client'
vi.mock('../src/api/client', () => ({ default: { get: vi.fn() } }))
let client, unbind
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, accessToken: null })
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  unbind = bindSessionCache(client)
})
afterEach(() => {
  cleanup()
  unbind()
  client.clear()
})
function login(id, role = 'GUEST', token = id) {
  useAuthStore.getState().setAuth({ id, role, name: id }, token)
}
function Favorites() {
  const query = useFavorites({ limit: 6 })
  return createElement('p', null, query.data ? `Favorites: ${query.data.total}` : 'Loading')
}
function mount() {
  render(createElement(QueryClientProvider, { client }, createElement(Favorites)))
}
it('shows each account favorites without reusing the previous account cache', async () => {
  login('editor', 'EDITOR')
  apiClient.get
    .mockResolvedValueOnce({ data: { favorites: [], total: 3 } })
    .mockResolvedValue({ data: { favorites: [], total: 0 } })
  mount()
  await screen.findByText('Favorites: 3')
  act(() => login('guest'))
  expect(screen.queryByText('Favorites: 3')).toBeNull()
  await screen.findByText('Favorites: 0')
  expect(client.getQueryData(['favorites', 'editor', 1, 6])).toBeUndefined()
  expect(client.getQueryData(['favorites', 'guest', 1, 6]).total).toBe(0)
})
it('clears personalized page data, counters and history on logout', () => {
  login('editor', 'EDITOR')
  for (const key of [
    ['page', 'intro'],
    ['favorites-count', 'editor', 1, 1],
    ['revisions', 'intro'],
  ])
    client.setQueryData(key, { privateData: true })
  useAuthStore.getState().clearAuth()
  expect(client.getQueryCache().getAll()).toHaveLength(0)
})
it('preserves cache for token rotation but clears it when permissions change', () => {
  login('user', 'EDITOR')
  client.setQueryData(['page', 'intro'], { favorited: true })
  login('user', 'EDITOR', 'rotated-token')
  expect(client.getQueryData(['page', 'intro'])).toEqual({ favorited: true })
  login('user', 'GUEST', 'guest-token')
  expect(client.getQueryData(['page', 'intro'])).toBeUndefined()
})
it('cancels an old account request and discards its late result', async () => {
  login('editor', 'EDITOR')
  let resolve, oldSignal
  apiClient.get
    .mockImplementationOnce((_url, { signal }) => {
      oldSignal = signal
      return new Promise((done) => {
        resolve = done
      })
    })
    .mockResolvedValue({ data: { favorites: [], total: 0 } })
  mount()
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1))
  act(() => login('guest'))
  await screen.findByText('Favorites: 0')
  expect(oldSignal.aborted).toBe(true)
  await act(async () => resolve({ data: { favorites: [], total: 9 } }))
  expect(screen.queryByText('Favorites: 9')).toBeNull()
  expect(client.getQueryData(['favorites', 'editor', 1, 6])).toBeUndefined()
})
it('does not fetch favorites without an authenticated account', () => {
  mount()
  expect(apiClient.get).not.toHaveBeenCalled()
})
