// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'

import { RevisionsDrawer } from '../src/components/revisions/RevisionsDrawer'
import apiClient from '../src/api/client'

const session = vi.hoisted(() => ({ user: { role: 'EDITOR' }, navigate: vi.fn() }))
vi.mock('../src/stores/auth.store', () => ({ useAuthStore: (selector) => selector(session) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => session.navigate }))
vi.mock('../src/api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

const page = {
  id: 'page',
  slug: 'current-title',
  title: 'Current title',
  content: '<p>Current content</p>',
  currentRevision: 2,
  createdBy: { id: 'author', name: 'Alex' },
}
const revision = {
  id: 'revision',
  pageId: 'page',
  revisionNumber: 0,
  title: 'Original title',
  content: '<p>Original content</p>',
  slug: 'original-title',
  summary: 'First version',
  createdBy: { id: 'author', name: 'Alex' },
  createdAt: '2026-10-08T10:00:00Z',
}
let client

beforeEach(() => {
  vi.clearAllMocks()
  session.user = { role: 'EDITOR' }
  apiClient.get.mockImplementation(async (url) => ({
    data: url.endsWith('/revisions')
      ? { revisions: [revision], total: 1, page: 1, limit: 10 }
      : revision,
  }))
  apiClient.post.mockResolvedValue({
    data: { ...page, slug: revision.slug, title: revision.title, currentRevision: 3 },
  })
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  client?.clear()
})

function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['page', page.slug], page)
  client.setQueryData(['pages', 'section', 'intro'], [page])
  const onClose = vi.fn()
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(RevisionsDrawer, { page, onClose }),
    ),
  )
  return { onClose }
}
async function selectRevision() {
  await userEvent.click(await screen.findByRole('button', { name: /Revision 0 · Original title/ }))
  await screen.findByText('Original content')
}

it('shows the current version and fetches a previous revision only when selected', async () => {
  mount()
  expect(await screen.findByText('Current content')).toBeTruthy()
  await screen.findByRole('button', { name: /Revision 0 · Original title/ })
  expect(apiClient.get).toHaveBeenCalledWith('/api/v2/pages/current-title/revisions', {
    params: { page: 1, limit: 10 },
  })
  expect(apiClient.get).not.toHaveBeenCalledWith('/api/v2/pages/current-title/revisions/0')
  await selectRevision()
  expect(apiClient.get).toHaveBeenCalledWith('/api/v2/pages/current-title/revisions/0')
  expect(screen.getByRole('button', { name: 'Restore this revision' })).toBeTruthy()
})

it('lets guests preview history without restore controls', async () => {
  session.user = { role: 'GUEST' }
  mount()
  await selectRevision()
  expect(screen.queryByRole('button', { name: 'Restore this revision' })).toBeNull()
  expect(apiClient.post).not.toHaveBeenCalled()
})

it('requires confirmation, allows cancellation and follows the returned slug after restoring', async () => {
  const { onClose } = mount()
  await selectRevision()
  await userEvent.click(screen.getByRole('button', { name: 'Restore this revision' }))
  expect(apiClient.post).not.toHaveBeenCalled()
  const confirmation = screen.getByRole('dialog', { name: 'Restore revision 0?' })
  await userEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
  expect(apiClient.post).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Restore this revision' }))
  await userEvent.click(
    within(screen.getByRole('dialog', { name: 'Restore revision 0?' })).getByRole('button', {
      name: 'Restore revision',
    }),
  )
  await waitFor(() => expect(onClose).toHaveBeenCalled())
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/pages/current-title/revisions/0/restore')
  expect(session.navigate).toHaveBeenCalledWith({
    to: '/pages/$slug',
    params: { slug: 'original-title' },
    replace: true,
  })
  expect(client.getQueryData(['page', page.slug])).toBeUndefined()
  expect(client.getQueryState(['pages', 'section', 'intro']).isInvalidated).toBe(true)
})

it('keeps restore failures visible and preserves the page and URL', async () => {
  apiClient.post.mockRejectedValue(
    new AxiosError('Conflict', undefined, undefined, undefined, {
      status: 409,
      data: { error: 'The page changed while restoring.' },
    }),
  )
  const { onClose } = mount()
  await selectRevision()
  await userEvent.click(screen.getByRole('button', { name: 'Restore this revision' }))
  await userEvent.click(
    within(screen.getByRole('dialog', { name: 'Restore revision 0?' })).getByRole('button', {
      name: 'Restore revision',
    }),
  )
  expect((await screen.findByRole('alert')).textContent).toContain('The page changed')
  expect(onClose).not.toHaveBeenCalled()
  expect(session.navigate).not.toHaveBeenCalled()
  expect(client.getQueryData(['page', page.slug])).toEqual(page)
})

it('refreshes the current page when the restored slug is unchanged', async () => {
  apiClient.post.mockResolvedValue({ data: { ...page, currentRevision: 3 } })
  const { onClose } = mount()
  await selectRevision()
  await userEvent.click(screen.getByRole('button', { name: 'Restore this revision' }))
  await userEvent.click(
    within(screen.getByRole('dialog', { name: 'Restore revision 0?' })).getByRole('button', {
      name: 'Restore revision',
    }),
  )
  await waitFor(() => expect(onClose).toHaveBeenCalled())
  expect(client.getQueryState(['page', page.slug]).isInvalidated).toBe(true)
  expect(session.navigate).not.toHaveBeenCalled()
})

it('shows the empty state and retries a failed history request', async () => {
  apiClient.get.mockRejectedValueOnce(new Error('offline'))
  apiClient.get.mockResolvedValue({ data: { revisions: [], total: 0, page: 1, limit: 10 } })
  mount()
  await screen.findByRole('alert')
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('No previous revisions yet')).toBeTruthy()
})

it('loads the next history page with the API pagination contract', async () => {
  apiClient.get.mockResolvedValue({
    data: { revisions: [revision], total: 11, page: 1, limit: 10 },
  })
  mount()
  await userEvent.click(await screen.findByRole('button', { name: /Next/ }))
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenCalledWith('/api/v2/pages/current-title/revisions', {
      params: { page: 2, limit: 10 },
    }),
  )
})
