// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResourceMetadata } from '../src/components/shared/ResourceMetadata'
import { DashboardPage } from '../src/pages/DashboardPage'
import { useAuthStore } from '../src/stores/auth.store'
import apiClient from '../src/api/client'
vi.mock('../src/api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
vi.mock('../src/components/dashboard/RecentlyVisited', () => ({ RecentlyVisited: () => null }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }) => createElement('a', { href: to }, children),
}))
vi.mock('../src/components/shared/Contributions', () => ({ Contributions: () => null }))
let client
beforeEach(() => {
  vi.resetAllMocks()
  useAuthStore.setState({
    user: { id: 'editor', role: 'EDITOR', name: 'Editor User' },
    accessToken: 'test',
  })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  apiClient.post.mockResolvedValue({ data: { favorited: true } })
  apiClient.delete.mockResolvedValue({ data: {} })
  apiClient.get.mockImplementation(async (url) => ({
    data: url.endsWith('/activities')
      ? { activities: [], total: 3 }
      : url.endsWith('/favorites')
        ? { favorites: [], total: 0 }
        : { subjects: [], total: 0 },
  }))
})
afterEach(() => {
  cleanup()
  client.clear()
})
function mount(Component, props = {}) {
  render(createElement(QueryClientProvider, { client }, createElement(Component, props)))
}
it.each([
  ['projects', 'projectId'],
  ['sections', 'sectionId'],
])('toggles a favorite, adds and removes tags on %s', async (type, key) => {
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  mount(ResourceMetadata, {
    resource: { type, id: 'resource', slug: 'slug' },
    tags: [{ id: 'tag', name: 'old', userId: 'editor' }],
  })
  await userEvent.click(screen.getByRole('button', { name: 'Add favorite' }))
  await waitFor(() =>
    expect(apiClient.post).toHaveBeenCalledWith('/api/v2/favorites', { [key]: 'resource' }),
  )
  await userEvent.type(screen.getByLabelText('New tag'), ' New ')
  await userEvent.click(screen.getByRole('button', { name: 'Add tag' }))
  await waitFor(() =>
    expect(apiClient.post).toHaveBeenCalledWith('/api/v2/tags', { [key]: 'resource', name: 'new' }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Remove tag old' }))
  await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/api/v2/tags/tag'))
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sections'] })
})
it('uses a personal activity feed for an Editor and removes fabricated statistics', async () => {
  mount(DashboardPage)
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenCalledWith('/api/v2/users/me/activities', expect.any(Object)),
  )
  expect(
    apiClient.get.mock.calls.some(
      ([url]) => url === '/api/v2/activities' || url === '/api/v2/dashboard/stats',
    ),
  ).toBe(false)
  expect(screen.queryByText('Views this week')).toBeNull()
  expect(screen.queryByRole('img', { name: /spark/i })).toBeNull()
})
it('loads actual Admin counts', async () => {
  useAuthStore.setState({ user: { id: 'admin', role: 'ADMIN', name: 'Admin User' } })
  apiClient.get.mockImplementation(async (url) => ({
    data: url.endsWith('/stats')
      ? { users: 12, pages: 24, subjects: 6 }
      : url.endsWith('/activities')
        ? { activities: [], total: 0 }
        : url.endsWith('/favorites')
          ? { favorites: [], total: 0 }
          : { subjects: [], total: 0 },
  }))
  mount(DashboardPage)
  await screen.findByText('24')
  expect(screen.getByText('12')).toBeTruthy()
  expect(screen.getByText('6')).toBeTruthy()
})
