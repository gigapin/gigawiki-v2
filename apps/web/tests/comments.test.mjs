// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentSection } from '../src/components/comments/CommentSection'
import apiClient from '../src/api/client'
const session = vi.hoisted(() => ({
  user: { id: 'me', name: 'Alex', slug: 'alex', role: 'GUEST' },
}))
vi.mock('../src/stores/auth.store', () => ({ useAuthStore: (selector) => selector(session) }))
vi.mock('../src/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const resource = { type: 'pages', id: 'p', slug: 'intro' }
const root = {
  id: 'c',
  body: 'Hello **wiki** <script>bad()</script>',
  parentId: null,
  userId: 'me',
  user: { id: 'me', name: 'Alex', slug: 'alex' },
  createdAt: '2026-10-09T10:00:00Z',
  updatedAt: '2026-10-09T10:00:00Z',
  replies: [],
}
let data, client
beforeEach(() => {
  vi.clearAllMocks()
  session.user = { id: 'me', name: 'Alex', slug: 'alex', role: 'GUEST' }
  data = { comments: [structuredClone(root)], total: 1, page: 1, limit: 10 }
  apiClient.get.mockImplementation(async () => ({ data: structuredClone(data) }))
})
afterEach(() => {
  cleanup()
  client?.clear()
})
function mount(type = 'pages') {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CommentSection, { resource: { ...resource, type } }),
    ),
  )
}
async function thread() {
  return screen.findByRole('article', { name: 'Comment by Alex' })
}
it('renders safe formatting, lets guests comment and enforces own edit/delete controls', async () => {
  session.user.id = 'other'
  mount()
  const item = await thread()
  expect(item.querySelector('strong').textContent).toBe('wiki')
  expect(item.querySelector('script')).toBeNull()
  expect(within(item).queryByRole('button', { name: 'Edit' })).toBeNull()
  expect(within(item).queryByRole('button', { name: 'Delete' })).toBeNull()
  expect(within(item).getByRole('button', { name: 'Reply' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Post comment' }).disabled).toBe(true)
})
it('shows a new comment optimistically and restores cache and draft after failure', async () => {
  let reject
  apiClient.post.mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail
      }),
  )
  mount()
  await thread()
  await userEvent.type(screen.getByRole('textbox', { name: 'New comment' }), 'Draft text')
  await userEvent.click(screen.getByRole('button', { name: 'Post comment' }))
  await screen.findByText('Draft text', { selector: 'p' })
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/comments', {
    body: 'Draft text',
    pageId: 'p',
  })
  reject(new Error('offline'))
  await screen.findByRole('alert')
  await waitFor(() => expect(screen.queryByText('Draft text', { selector: 'p' })).toBeNull())
  expect(screen.getByRole('textbox', { name: 'New comment' }).value).toBe('Draft text')
  expect(client.getQueryData(['comments', 'pages', 'intro', 1, 10]).total).toBe(1)
})
it('posts replies to roots and does not offer nested replies', async () => {
  apiClient.post.mockImplementation(async (_url, input) => {
    const reply = { ...root, id: 'r', body: input.body, parentId: 'c', replies: [] }
    data.comments[0].replies.push(reply)
    return { data: reply }
  })
  mount()
  await userEvent.click(within(await thread()).getByRole('button', { name: 'Reply' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Reply to Alex' }), 'Reply text')
  await userEvent.click(screen.getByRole('button', { name: 'Post reply' }))
  await screen.findByText('Reply text')
  expect(apiClient.post).toHaveBeenCalledWith('/api/v2/comments', {
    body: 'Reply text',
    pageId: 'p',
    parentId: 'c',
  })
  expect(screen.getAllByRole('button', { name: 'Reply' })).toHaveLength(1)
})
it('preserves an edit draft on failure and allows retry', async () => {
  apiClient.patch
    .mockRejectedValueOnce(new Error('offline'))
    .mockImplementation(async (_url, input) => {
      data.comments[0].body = input.body
      return { data: data.comments[0] }
    })
  mount()
  await userEvent.click(within(await thread()).getByRole('button', { name: 'Edit' }))
  const input = screen.getByRole('textbox', { name: 'Edit comment' })
  await userEvent.clear(input)
  await userEvent.type(input, 'Changed text')
  await userEvent.click(screen.getByRole('button', { name: 'Save comment' }))
  await screen.findByRole('alert')
  expect(input.value).toBe('Changed text')
  await userEvent.click(screen.getByRole('button', { name: 'Save comment' }))
  await screen.findByText('Changed text')
  expect(apiClient.patch).toHaveBeenLastCalledWith('/api/v2/comments/c', { body: 'Changed text' })
})
it('requires delete confirmation, allows cancellation and removes the root and replies', async () => {
  apiClient.delete.mockImplementation(async () => {
    data = { ...data, comments: [], total: 0 }
    return { data: {} }
  })
  mount()
  await userEvent.click(within(await thread()).getByRole('button', { name: 'Delete' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
  expect(apiClient.delete).not.toHaveBeenCalled()
  await userEvent.click(within(await thread()).getByRole('button', { name: 'Delete' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
  await screen.findByText('No comments yet')
  expect(apiClient.delete).toHaveBeenCalledWith('/api/v2/comments/c')
})
it('allows admins to delete other comments but not edit them', async () => {
  session.user = { ...session.user, id: 'admin', role: 'ADMIN' }
  mount()
  const item = await thread()
  expect(within(item).getByRole('button', { name: 'Delete' })).toBeTruthy()
  expect(within(item).queryByRole('button', { name: 'Edit' })).toBeNull()
})
it('retries loading failures and supports project resources', async () => {
  apiClient.get.mockRejectedValueOnce(new Error('offline'))
  mount('projects')
  await screen.findByRole('alert')
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await thread()
  expect(apiClient.get).toHaveBeenLastCalledWith(
    '/api/v2/projects/intro/comments',
    expect.objectContaining({ params: { page: 1, limit: 10 } }),
  )
})
it('uses root pagination without creating a new thread on the wrong page', async () => {
  data = { ...data, total: 11 }
  mount()
  await thread()
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenLastCalledWith(
      '/api/v2/pages/intro/comments',
      expect.objectContaining({ params: { page: 2, limit: 10 } }),
    ),
  )
})
it('restores a deleted thread and its replies on failure', async () => {
  data.comments[0].replies = [{ ...root, id: 'r', parentId: 'c', body: 'Existing reply' }]
  apiClient.delete.mockRejectedValue(new Error('offline'))
  mount()
  await userEvent.click(within(await thread()).getByRole('button', { name: 'Delete' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
  await screen.findByRole('alert')
  await waitFor(() =>
    expect(
      client.getQueryData(['comments', 'pages', 'intro', 1, 10]).comments[0].replies,
    ).toHaveLength(1),
  )
  expect(client.getQueryData(['comments', 'pages', 'intro', 1, 10]).total).toBe(1)
})
it('returns to the preceding page after deleting its final thread', async () => {
  data.total = 11
  apiClient.get.mockImplementation(async (_url, { params }) => ({
    data: { ...structuredClone(data), page: params.page },
  }))
  apiClient.delete.mockImplementation(async () => {
    data.total = 10
    data.comments = []
    return { data: {} }
  })
  mount()
  await thread()
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() =>
    expect(client.getQueryData(['comments', 'pages', 'intro', 2, 10])).toBeTruthy(),
  )
  await userEvent.click(within(await thread()).getByRole('button', { name: 'Delete' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenLastCalledWith(
      '/api/v2/pages/intro/comments',
      expect.objectContaining({ params: { page: 1, limit: 10 } }),
    ),
  )
})
