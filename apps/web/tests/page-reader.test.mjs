import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PageReaderPage } from '../src/pages/pages/PageReaderPage'
import { deletePage } from '../src/api/pages'
import apiClient from '../src/api/client'

const state = vi.hoisted(() => ({ user: null, navigate: vi.fn(), mutation: null }))
vi.mock('../src/stores/auth.store', () => ({ useAuthStore: (selector) => selector(state) }))
vi.mock('../src/api/client', () => ({ default: { get: vi.fn(), delete: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ slug: 'welcome' }),
  useNavigate: () => state.navigate,
  Link: ({ children, to }) => createElement('a', { href: to }, children),
}))
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal()),
  useMutation: (options) => {
    if (!state.mutation) state.mutation = options
    return { isPending: false, isError: false, reset: vi.fn(), mutate: vi.fn() }
  },
}))
vi.mock('../src/components/pages/PageContent', () => ({
  PageContent: ({ content }) => createElement('article', null, content),
}))

const page = {
  id: 'page',
  slug: 'welcome',
  title: 'Welcome',
  content: 'Wiki content',
  visibility: 'PUBLIC',
  currentRevision: 0,
  isDraft: false,
  updatedAt: '2026-10-08T10:00:00Z',
  createdBy: { name: 'Alex' },
  project: { slug: 'guide', name: 'Guide', subject: { name: 'Engineering', slug: 'engineering' } },
  section: { slug: 'intro', title: 'Introduction' },
}

function render(role) {
  state.user = { role }
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(['page', 'welcome'], page)
  const html = renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(PageReaderPage)),
  )
  return { html, client }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.mutation = null
})

it.each(['GUEST', 'EDITOR', 'ADMIN'])(
  'shows page actions for %s according to permissions',
  (role) => {
    const { html, client } = render(role)
    expect(html).toContain('Wiki content')
    expect(html.includes('Delete page')).toBe(role === 'ADMIN')
    expect(html.includes('Edit page')).toBe(role !== 'GUEST')
    expect(html.includes('View history')).toBe(role !== 'GUEST')
    client.clear()
  },
)

it('uses DELETE and propagates API failures without hiding them', async () => {
  apiClient.delete.mockResolvedValueOnce({ data: { message: 'Page deleted successfully' } })
  await expect(deletePage('welcome')).resolves.toBeUndefined()
  expect(apiClient.delete).toHaveBeenCalledWith('/api/v2/pages/welcome')
  apiClient.delete.mockRejectedValueOnce(new Error('Admin access required'))
  await expect(deletePage('welcome')).rejects.toThrow('Admin access required')
})

it('returns to the original section and clears stale page data after deletion', async () => {
  const { client } = render('ADMIN')
  client.setQueryData(['pages', 'section', 'intro', 1, 10], { pages: [page] })
  client.setQueryData(['sections', 'guide'], [{ slug: 'intro', _count: { pages: 1 } }])
  client.setQueryData(['project', 'guide'], { slug: 'guide' })
  client.setQueryData(['favorites-count'], 1)
  const cachedKeys = ['pages', 'sections', 'project', 'favorites-count']
  await state.mutation.onSuccess()
  expect(state.navigate).toHaveBeenCalledWith({
    to: '/projects/$slug',
    params: { slug: 'guide' },
    search: { section: 'intro' },
  })
  expect(client.getQueryData(['page', 'welcome'])).toBeUndefined()
  for (const key of cachedKeys) {
    expect(client.getQueryCache().find({ queryKey: [key], exact: false }).state.isInvalidated).toBe(
      true,
    )
  }
  client.clear()
})
