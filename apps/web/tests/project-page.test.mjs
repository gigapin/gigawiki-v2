import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProjectDetail } from '../src/pages/projects/ProjectDetailPage'
const session = vi.hoisted(() => ({ user: null }))
vi.mock('../src/stores/auth.store', () => ({ useAuthStore: (selector) => selector(session) }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }) => createElement('a', { href: to, ...props }, children),
}))

function render(
  role,
  owner = false,
  sections = [
    {
      id: 'section',
      slug: 'intro',
      title: 'Introduction',
      visibility: 'PUBLIC',
      _count: { pages: 1 },
    },
  ],
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  session.user = { id: owner ? 'owner' : 'visitor', role }
  client.setQueryData(['project', 'guide'], {
    id: 'project',
    userId: 'owner',
    subjectId: 'subject',
    name: 'Guide',
    slug: 'guide',
    visibility: 'PUBLIC',
    tags: [],
  })
  client.setQueryData(['sections', 'guide'], sections)
  client.setQueryData(['pages', 'section', 'intro', 1, 10], {
    pages: [
      {
        id: 'page',
        title: 'Welcome',
        slug: 'welcome',
        visibility: 'PRIVATE',
        isDraft: true,
        restricted: true,
        createdBy: { name: 'Alex' },
        updatedAt: '2026-10-07T10:00:00Z',
      },
    ],
    total: 21,
    page: 1,
    limit: 10,
  })
  const html = renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(ProjectDetail, { slug: 'guide' })),
  )
  client.clear()
  return html
}

it('lets guests browse pages without exposing mutation controls', () => {
  const html = render('GUEST')
  expect(html).toContain('Welcome')
  expect(html).toContain('Draft')
  expect(html).toContain('Restricted')
  expect(html).toContain('Page 1 of 3')
  expect(html).not.toContain('New section')
  expect(html).not.toContain('Edit project')
  expect(html).not.toContain('Delete section')
})

it('allows editors to create and reorder but reserves editing for the owner', () => {
  const html = render('EDITOR')
  expect(html).toContain('New section')
  expect(html).toContain('Move Introduction up')
  expect(html).not.toContain('Edit project')
  expect(html).not.toContain('Edit section')
  expect(html).not.toContain('Delete project')
})

it('allows owners to edit but reserves deletion for admins', () => {
  const html = render('EDITOR', true)
  expect(html).toContain('Edit project')
  expect(html).toContain('Edit section')
  expect(html).not.toContain('Delete project')
})

it('allows administrators to manage projects and sections', () => {
  const html = render('ADMIN')
  expect(html).toContain('Delete project')
  expect(html).toContain('Delete section')
})

it('shows an actionable empty state only to editors', () => {
  expect(render('EDITOR', false, [])).toContain('Create your first section')
  expect(render('EDITOR', false, [])).toContain('New section')
  expect(render('GUEST', false, [])).not.toContain('New section')
})

it('offers contextual creation to editors and links pages to the reader', () => {
  const html = render('EDITOR')
  expect(html).toContain('New page')
  expect(html).toContain('href="/pages/$slug"')
  expect(render('GUEST')).not.toContain('New page')
})
