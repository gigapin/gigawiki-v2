// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act, cleanup } from '@testing-library/react'
import { useSubjects, useCreateSubject, useDeleteSubject } from '../src/api/subjects'
import { useProjects } from '../src/api/projects'
import { usePage, useSearch, useDeletePage } from '../src/api/pages'
import { useUpdateSetting } from '../src/api/settings'
import { useLogin, useLogout } from '../src/api/auth'
import { useAuthStore } from '../src/stores/auth.store'
import { useSettingsStore } from '../src/stores/settings.store'
import { bindSessionCache } from '../src/lib/session-cache'
import { queryKeys } from '../src/api/query-keys'
import apiClient from '../src/api/client'

vi.mock('../src/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), put: vi.fn() },
}))
let client, unbind
beforeEach(() => {
  vi.resetAllMocks()
  useAuthStore.setState({ user: { id: 'one', role: 'EDITOR' }, accessToken: 'one' })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  unbind = bindSessionCache(client)
})
afterEach(() => {
  cleanup()
  unbind()
  client.clear()
})
const wrapper = ({ children }) => createElement(QueryClientProvider, { client }, children)
const mount = (hook, options) => renderHook(hook, { wrapper, ...options })

it('keeps dashboard counts and navigation lists separate, but shares identical lists', async () => {
  apiClient.get.mockImplementation(async (_url, { params }) => ({
    data: { subjects: Array.from({ length: params.limit }, (_, id) => ({ id })), total: 80 },
  }))
  const { result } = mount(() => ({
    count: useSubjects({ limit: 1 }),
    nav: useSubjects({ limit: 50 }),
    browse: useSubjects({ limit: 50 }),
  }))
  await waitFor(() => expect(result.current.browse.isSuccess).toBe(true))
  expect(result.current.count.data.subjects).toHaveLength(1)
  expect(result.current.nav.data.subjects).toHaveLength(50)
  expect(apiClient.get).toHaveBeenCalledTimes(2)
})
it('separates list pages and filters', async () => {
  apiClient.get.mockImplementation(async (_url, { params }) => ({
    data: { subjects: [{ id: `${params.page}-${params.visibility}` }], total: 4 },
  }))
  const { result, rerender } = mount(({ page, visibility }) => useSubjects({ page, visibility }), {
    initialProps: { page: 1, visibility: 'PUBLIC' },
  })
  await waitFor(() => expect(result.current.data.subjects[0].id).toBe('1-PUBLIC'))
  rerender({ page: 2, visibility: 'PRIVATE' })
  await waitFor(() => expect(result.current.data.subjects[0].id).toBe('2-PRIVATE'))
  expect(
    client.getQueryData(queryKeys.subjects({ page: 1, visibility: 'PUBLIC' })).subjects[0].id,
  ).toBe('1-PUBLIC')
})
it('does not request dependent resources without identifiers', () => {
  mount(() => ({ project: useProjects(undefined), page: usePage('') }))
  expect(apiClient.get).not.toHaveBeenCalled()
})
it('refreshes both subject count and browsing lists after creation', async () => {
  let created = false
  apiClient.get.mockImplementation(async (_url, { params }) => ({
    data: { subjects: created ? [{ id: 'new' }] : [], total: created ? 1 : 0, limit: params.limit },
  }))
  apiClient.post.mockImplementation(async () => {
    created = true
    return { data: { id: 'new', slug: 'new' } }
  })
  const { result } = mount(() => ({
    count: useSubjects({ limit: 1 }),
    list: useSubjects({ limit: 50 }),
    create: useCreateSubject(),
  }))
  await waitFor(() => expect(result.current.list.isSuccess).toBe(true))
  await act(() =>
    result.current.create.mutateAsync({
      name: 'New',
      description: '',
      color: 'emerald',
      icon: 'book',
      visibility: 'PUBLIC',
    }),
  )
  await waitFor(() => {
    expect(result.current.count.data.total).toBe(1)
    expect(result.current.list.data.subjects).toHaveLength(1)
  })
})
it('keeps unrelated cached data fresh when a subject is created', async () => {
  client.setQueryData(['comments', 'pages', 'other'], { comments: [] })
  apiClient.post.mockResolvedValue({ data: { slug: 'new' } })
  const { result } = mount(() => useCreateSubject())
  await act(() => result.current.mutateAsync({ name: 'New' }))
  expect(client.getQueryState(['comments', 'pages', 'other']).isInvalidated).toBe(false)
})
it('preserves cached subject and lists if deletion fails', async () => {
  client.setQueryData(queryKeys.subject('intro'), { slug: 'intro' })
  client.setQueryData(queryKeys.subjects({ limit: 50 }), { total: 1 })
  apiClient.delete.mockRejectedValue(new Error('Forbidden'))
  const { result } = mount(() => useDeleteSubject('intro'))
  await act(async () => {
    await expect(result.current.mutateAsync()).rejects.toThrow('Forbidden')
  })
  expect(client.getQueryData(queryKeys.subject('intro')).slug).toBe('intro')
  expect(client.getQueryState(queryKeys.subjects({ limit: 50 })).isInvalidated).toBe(false)
})
it('removes deleted page cache and invalidates affected lists, views and search', async () => {
  client.setQueryData(queryKeys.page('intro'), { slug: 'intro' })
  const keys = [
    queryKeys.pages('section'),
    queryKeys.project('project'),
    queryKeys.search('intro'),
    queryKeys.views('one', 6),
  ]
  keys.forEach((key) => client.setQueryData(key, {}))
  apiClient.delete.mockResolvedValue({})
  const onSuccess = vi.fn()
  const { result } = mount(() => useDeletePage('intro', { onSuccess }))
  await act(() => result.current.mutateAsync())
  expect(client.getQueryData(queryKeys.page('intro'))).toBeUndefined()
  keys.forEach((key) => expect(client.getQueryState(key).isInvalidated).toBe(true))
  expect(onSuccess).toHaveBeenCalledTimes(1)
})
it('cancels previous searches and never replaces current matches with late results', async () => {
  let finishOld, oldSignal
  apiClient.get
    .mockImplementationOnce((_url, { signal }) => {
      oldSignal = signal
      return new Promise((resolve) => {
        finishOld = resolve
      })
    })
    .mockResolvedValue({ data: { results: [{ slug: 'new' }] } })
  const { result, rerender } = mount(({ q }) => useSearch(q), { initialProps: { q: 'old' } })
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1))
  rerender({ q: 'new' })
  await waitFor(() => expect(result.current.data?.results[0].slug).toBe('new'))
  expect(oldSignal.aborted).toBe(true)
  await act(async () => finishOld({ data: { results: [{ slug: 'old' }] } }))
  expect(result.current.data.results[0].slug).toBe('new')
})
it('does not search empty or one-character terms', () => {
  const { rerender } = mount(({ q }) => useSearch(q), { initialProps: { q: ' ' } })
  rerender({ q: ' a ' })
  expect(apiClient.get).not.toHaveBeenCalled()
})
it('updates admin and registration settings plus branding without dropping other settings', async () => {
  const settings = {
    SITE_NAME: 'Old',
    ALLOW_SELF_REGISTRATION: 'false',
    DEFAULT_USER_ROLE: 'GUEST',
  }
  client.setQueryData(queryKeys.settings(), settings)
  client.setQueryData(queryKeys.publicSettings(), settings)
  useSettingsStore.setState({ settings })
  apiClient.put.mockResolvedValue({ data: { key: 'SITE_NAME', value: 'New' } })
  const { result } = mount(() => useUpdateSetting())
  await act(() => result.current.mutateAsync({ key: 'SITE_NAME', value: 'New' }))
  for (const key of [queryKeys.settings(), queryKeys.publicSettings()])
    expect(client.getQueryData(key)).toEqual({ ...settings, SITE_NAME: 'New' })
  expect(useSettingsStore.getState().settings.SITE_NAME).toBe('New')
})
it('discards login completed after a switch to another account', async () => {
  let finish
  apiClient.post.mockResolvedValue({ data: { accessToken: 'new' } })
  apiClient.get.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const { result } = mount(() => useLogin())
  let pending
  act(() => {
    pending = result.current
      .mutateAsync({ email: 'alice@example.com', password: 'secret' })
      .catch((e) => e)
  })
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1))
  act(() => useAuthStore.getState().setAuth({ id: 'another', role: 'GUEST' }, 'another'))
  await act(async () => {
    finish({ data: { user: { id: 'alice', role: 'EDITOR' } } })
    await pending
  })
  expect(useAuthStore.getState().user.id).toBe('another')
})
it('clears session and private cache even when server logout fails', async () => {
  client.setQueryData(queryKeys.page('private'), { private: true })
  apiClient.post.mockRejectedValue(new Error('Offline'))
  const { result } = mount(() => useLogout())
  await act(async () => {
    await expect(result.current.mutateAsync()).rejects.toThrow('Offline')
  })
  expect(useAuthStore.getState().user).toBeNull()
  expect(client.getQueryCache().getAll()).toHaveLength(0)
})
