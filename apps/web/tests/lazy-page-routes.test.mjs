// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryHistory, Outlet, RouterProvider } from '@tanstack/react-router'

import { router } from '../src/router'
import { useAuthStore } from '../src/stores/auth.store'

vi.mock('../src/components/AppInit', () => ({ AppInit: () => createElement(Outlet) }))
vi.mock('../src/components/layout/AppShell', () => ({ AppShell: () => createElement(Outlet) }))
vi.mock('../src/pages/pages/PageEditorPage', () => ({
  NewPagePage: () => createElement('h1', null, 'New page route'),
  EditPagePage: () => createElement('h1', null, 'Edit page route'),
}))
vi.mock('../src/pages/pages/PageReaderPage', () => ({
  PageReaderPage: () => createElement('h1', null, 'Reader route'),
}))

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  useAuthStore.setState({
    user: { id: 'editor', role: 'EDITOR' },
    accessToken: 'test-token',
    isInitialized: true,
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each([
  ['/projects/guide/sections/intro/pages/new', 'New page route'],
  ['/pages/welcome/edit', 'Edit page route'],
  ['/pages/welcome', 'Reader route'],
])('loads the correct page when opened directly at %s', async (path, heading) => {
  router.update({ history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  render(createElement(RouterProvider, { router }))
  expect(await screen.findByRole('heading', { name: heading })).toBeTruthy()
})

it('navigates from the reader to the editor without reloading the document', async () => {
  router.update({ history: createMemoryHistory({ initialEntries: ['/pages/welcome'] }) })
  await router.load()
  render(createElement(RouterProvider, { router }))
  expect(await screen.findByRole('heading', { name: 'Reader route' })).toBeTruthy()
  await router.navigate({ to: '/pages/$slug/edit', params: { slug: 'welcome' } })
  expect(await screen.findByRole('heading', { name: 'Edit page route' })).toBeTruthy()
})
