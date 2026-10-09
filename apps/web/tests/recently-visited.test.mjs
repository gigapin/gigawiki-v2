// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, act, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecentlyVisited } from '../src/components/dashboard/RecentlyVisited'
import { useAuthStore } from '../src/stores/auth.store'
import { bindSessionCache } from '../src/lib/session-cache'
import apiClient from '../src/api/client'
vi.mock('../src/api/client', () => ({ default: { get: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }) =>
    createElement(
      'a',
      {
        ...props,
        href:
          to.replace('$slug', params.slug) + (search?.section ? `?section=${search.section}` : ''),
      },
      children,
    ),
}))
let client, unbind
const now = new Date().toISOString()
const views = [
  {
    id: 'v1',
    lastSeenAt: now,
    page: { id: 'p', title: 'Page title', slug: 'page' },
    project: null,
    section: null,
  },
  {
    id: 'v2',
    lastSeenAt: now,
    page: null,
    project: { id: 'pr', name: 'Project title', slug: 'project' },
    section: null,
  },
  {
    id: 'v3',
    lastSeenAt: now,
    page: null,
    project: null,
    section: { id: 's', title: 'Section title', slug: 'intro', project: { slug: 'project' } },
  },
]
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: { id: 'guest', role: 'GUEST' }, accessToken: 'guest-token' })
  apiClient.get.mockResolvedValue({ data: { views, total: 3, page: 1, limit: 6 } })
})
afterEach(() => {
  cleanup()
  unbind?.()
  client?.clear()
})
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  unbind = bindSessionCache(client)
  render(createElement(QueryClientProvider, { client }, createElement(RecentlyVisited)))
}
it('renders the three resource links with section selection and the personal query contract', async () => {
  mount()
  expect((await screen.findByRole('link', { name: /Page title/ })).getAttribute('href')).toBe(
    '/pages/page',
  )
  expect(screen.getByRole('link', { name: /Project title/ }).getAttribute('href')).toBe(
    '/projects/project',
  )
  expect(screen.getByRole('link', { name: /Section title/ }).getAttribute('href')).toBe(
    '/projects/project?section=intro',
  )
  expect(apiClient.get).toHaveBeenCalledWith('/api/v2/views', {
    params: { page: 1, limit: 6 },
    signal: expect.any(AbortSignal),
  })
  expect(screen.getAllByText('Visited just now')).toHaveLength(3)
  expect(client.getQueryData(['views', 'guest', 1, 6]).views).toHaveLength(3)
})
it('shows a loading state, then an empty state', async () => {
  let resolve
  apiClient.get.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  mount()
  expect(screen.getByRole('status', { name: 'Loading content' })).toBeTruthy()
  await act(async () => resolve({ data: { views: [], total: 0, page: 1, limit: 6 } }))
  await screen.findByText('No recent visits yet')
})
it('allows retry after history loading fails', async () => {
  apiClient.get.mockRejectedValueOnce(new Error('offline'))
  mount()
  await screen.findByRole('alert')
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByRole('link', { name: /Page title/ })
})
it('removes previous account visits immediately when changing accounts', async () => {
  mount()
  await screen.findByRole('link', { name: /Page title/ })
  apiClient.get.mockResolvedValue({ data: { views: [], total: 0, page: 1, limit: 6 } })
  act(() => useAuthStore.getState().setAuth({ id: 'second-user', role: 'EDITOR' }, 'second-token'))
  expect(screen.queryByRole('link', { name: /Page title/ })).toBeNull()
  await screen.findByText('No recent visits yet')
  expect(client.getQueryData(['views', 'guest', 1, 6])).toBeUndefined()
})
it('refreshes history when returning to the dashboard, even within cache stale time', async () => {
  mount()
  await screen.findByRole('link', { name: /Page title/ })
  cleanup()
  apiClient.get.mockResolvedValue({
    data: {
      views: [{ ...views[0], page: { ...views[0].page, title: 'New visit' } }],
      total: 1,
      page: 1,
      limit: 6,
    },
  })
  render(createElement(QueryClientProvider, { client }, createElement(RecentlyVisited)))
  await screen.findByRole('link', { name: /New visit/ })
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2))
})
