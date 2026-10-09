// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageMetadata } from '../src/components/pages/PageMetadata'
import apiClient from '../src/api/client'
const session = vi.hoisted(() => ({ user: { id: 'me', role: 'EDITOR' } }))
vi.mock('../src/stores/auth.store', () => ({
  useAuthStore: Object.assign((selector) => selector(session), { getState: () => session }),
}))
vi.mock('../src/api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
const page = {
  id: 'p',
  slug: 'intro',
  tags: [{ id: 't', name: 'wiki', userId: 'me' }],
  favorited: false,
  _count: { favorites: 2, comments: 0 },
}
let client
beforeEach(() => {
  vi.clearAllMocks()
  session.user = { id: 'me', role: 'EDITOR' }
  apiClient.get.mockResolvedValue({ data: [{ id: 's', name: 'react' }] })
  apiClient.post.mockResolvedValue({ data: { favorited: true } })
  apiClient.delete.mockResolvedValue({ data: {} })
})
afterEach(() => {
  cleanup()
  client.clear()
})
function mount(value = page) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['page', page.slug], value)
  client.setQueryData(['favorites'], [])
  client.setQueryData(['favorites-count'], 2)
  render(
    createElement(QueryClientProvider, { client }, createElement(PageMetadata, { page: value })),
  )
}
it('allows guests to favorite while hiding tag controls owned by others', async () => {
  session.user = { id: 'guest', role: 'GUEST' }
  mount()
  expect(screen.queryByRole('combobox', { name: 'New tag' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Remove tag wiki' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Add favorite' }))
  await waitFor(() => expect(client.getQueryData(['page', 'intro']).favorited).toBe(true))
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/favorites', { pageId: 'p' })
  expect(client.getQueryData(['page', 'intro'])._count.favorites).toBe(1)
  expect(client.getQueryState(['favorites-count']).isInvalidated).toBe(true)
})
it('normalizes tags, prevents duplicates and invalidates the page after create/delete', async () => {
  mount()
  const input = screen.getByRole('combobox', { name: 'New tag' })
  await userEvent.type(input, ' WIKI ')
  expect(screen.getByRole('button', { name: 'Add tag' }).disabled).toBe(true)
  await userEvent.clear(input)
  await userEvent.type(input, ' React ')
  await userEvent.click(screen.getByRole('button', { name: 'Add tag' }))
  await waitFor(() => expect(input.value).toBe(''))
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/tags', { name: 'react', pageId: 'p' })
  expect(client.getQueryState(['page', 'intro']).isInvalidated).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Remove tag wiki' }))
  expect(apiClient.delete).toHaveBeenCalledWith('/api/v2/tags/t')
})
it('keeps failed favorite changes out of cache and shows an error', async () => {
  apiClient.post.mockRejectedValue(new Error('offline'))
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Add favorite' }))
  await screen.findByRole('alert')
  expect(client.getQueryData(['page', 'intro'])).toEqual(page)
})
it('enforces the ten tag limit and lets admins remove tags by other users', () => {
  session.user = { id: 'admin', role: 'ADMIN' }
  mount({
    ...page,
    tags: Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `tag${i}`,
      userId: 'other',
    })),
  })
  expect(screen.queryByRole('combobox', { name: 'New tag' })).toBeNull()
  expect(screen.getByText('Maximum 10 tags per page')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Remove tag tag0' })).toBeTruthy()
})

it('ignores a favorite mutation response after switching accounts', async () => {
  let resolve
  apiClient.post.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Add favorite' }))
  await waitFor(() => expect(apiClient.post).toHaveBeenCalled())
  session.user = { id: 'guest', role: 'GUEST' }
  resolve({ data: { favorited: true } })
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Add favorite' }).disabled).toBe(false),
  )
  expect(client.getQueryData(['page', 'intro']).favorited).toBe(false)
})

it('does not show other users favorite totals beside the personal toggle', () => {
  mount({ ...page, favorited: false, _count: { favorites: 99, comments: 0 } })
  const button = screen.getByRole('button', { name: 'Add favorite' })
  expect(button.getAttribute('aria-pressed')).toBe('false')
  expect(button.textContent).not.toContain('99')
})
