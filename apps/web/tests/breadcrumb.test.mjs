import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectBreadcrumb } from '../src/components/shared/ProjectBreadcrumb'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params = {}, search = {}, ...props }) => {
    const pathname = to.replace(/\$([\w]+)/g, (_, name) => encodeURIComponent(params[name]))
    const query = new URLSearchParams(
      Object.entries(search).filter(([, value]) => value !== undefined),
    ).toString()
    return createElement('a', { href: pathname + (query ? `?${query}` : ''), ...props }, children)
  },
}))

const context = {
  subject: { name: 'Engineering', slug: 'engineering' },
  project: { name: 'Guide', slug: 'guide' },
  section: { title: 'Operations', slug: 'operations' },
  current: 'Welcome',
}

it('links each ancestor and restores the originating section through the URL', () => {
  const html = renderToStaticMarkup(createElement(ProjectBreadcrumb, context))
  expect(html).toContain('href="/subjects/engineering"')
  expect(html).toContain('href="/projects/guide"')
  expect(html).toContain('href="/projects/guide?section=operations"')
  expect(html).toContain('aria-current="page">Welcome')
  expect(html).not.toContain('href="/pages/')
})

it('links back to the page while editing and keeps the current location as text', () => {
  const html = renderToStaticMarkup(
    createElement(ProjectBreadcrumb, {
      ...context,
      page: { title: 'Welcome', slug: 'welcome' },
      current: 'Edit page',
    }),
  )
  expect(html).toContain('href="/pages/welcome"')
  expect(html).toContain('aria-current="page">Edit page')
})
