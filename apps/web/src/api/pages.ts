import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Page } from '@shared/types/page'

import { queryKeys } from './query-keys'
import type { MutationOptions, ReadOptions } from './hook-options'
import { invalidateResources, pageDependencies } from './cache'
import apiClient from './client'

export type PageListItem = Pick<
  Page,
  'id' | 'title' | 'slug' | 'isDraft' | 'restricted' | 'visibility' | 'updatedAt'
> & {
  currentRevision?: number
  createdBy: { id: string; name: string; slug: string }
}
export interface PagesResponse {
  pages: PageListItem[]
  total: number
  page: number
  limit: number
}

export function usePages(sectionSlug: string | undefined, page = 1, limit = 10) {
  return useQuery({
    queryKey: queryKeys.pages(sectionSlug, page, limit),
    enabled: Boolean(sectionSlug),
    refetchOnMount: 'always',
    queryFn: ({ signal }) =>
      apiClient
        .get<PagesResponse>(`/api/v2/sections/${sectionSlug}/pages`, {
          params: { page, limit },
          signal,
        })
        .then((response) => response.data),
  })
}

export type PageDetail = Page & {
  tags: { id: string; name: string; userId: string }[]
  favorited: boolean
  _count: { comments: number; favorites: number }
  createdBy: { id: string; name: string; slug: string }
  project: { id: string; name: string; slug: string; subject: { name: string; slug: string } }
  section: { id: string; title: string; slug: string }
}
export type PageInput = {
  expectedRevision?: number
  restricted?: boolean
  ownedById?: string
  title: string
  content: string
  isDraft: boolean
  visibility: 'PUBLIC' | 'PRIVATE'
}
export function fetchPage(slug: string, signal?: AbortSignal): Promise<PageDetail> {
  return (
    signal
      ? apiClient.get<PageDetail>(`/api/v2/pages/${slug}`, { signal })
      : apiClient.get<PageDetail>(`/api/v2/pages/${slug}`)
  ).then((r) => r.data)
}
export function deletePage(slug: string): Promise<void> {
  return apiClient.delete(`/api/v2/pages/${slug}`).then(() => undefined)
}
export function savePage(
  input: PageInput,
  location: { slug: string } | { sectionId: string },
): Promise<PageListItem> {
  return (
    'slug' in location
      ? apiClient.patch<PageListItem>(`/api/v2/pages/${location.slug}`, input)
      : apiClient.post<PageListItem>('/api/v2/pages', { ...input, sectionId: location.sectionId })
  ).then((r) => r.data)
}

export function usePage(slug: string, options: ReadOptions = {}) {
  return useQuery({
    queryKey: queryKeys.page(slug),
    queryFn: ({ signal }) => fetchPage(slug, signal),
    ...options,
    enabled: Boolean(slug) && options.enabled !== false,
  })
}
export type SavePageVariables = { payload: PageInput; automatic: boolean }
export function useSavePage(
  location: { slug: string } | { sectionId: string },
  options: MutationOptions<PageListItem, SavePageVariables> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: ({ payload }: SavePageVariables) => savePage(payload, location),
    onSuccess: async (page, variables, result, context) => {
      const slug = 'slug' in location ? location.slug : undefined
      if (slug) {
        await client.cancelQueries({ queryKey: queryKeys.page(slug), exact: true })
        if (variables.automatic || variables.payload.isDraft) {
          const previous = client.getQueryData<PageDetail>(queryKeys.page(slug))
          if (previous)
            client.setQueryData(queryKeys.page(page.slug), {
              ...previous,
              ...variables.payload,
              ...page,
            })
        }
        if (page.slug !== slug)
          client.removeQueries({ queryKey: queryKeys.page(slug), exact: true, type: 'inactive' })
      }
      await invalidateResources(client, ['page', 'revisions', 'revision', ...pageDependencies])
      await options.onSuccess?.(page, variables, result, context)
    },
  })
}
export function useCreatePage(
  options: MutationOptions<PageListItem, PageInput & { sectionId: string }> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: ({ sectionId, ...input }: PageInput & { sectionId: string }) =>
      savePage(input, { sectionId }),
    onSuccess: async (data, variables, result, context) => {
      await invalidateResources(client, pageDependencies)
      await options.onSuccess?.(data, variables, result, context)
    },
  })
}
export function useUpdatePage(
  slug: string,
  options: MutationOptions<PageListItem, PageInput> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: (input: PageInput) => savePage(input, { slug }),
    onSuccess: async (data, variables, result, context) => {
      await client.cancelQueries({ queryKey: queryKeys.page(slug), exact: true })
      await invalidateResources(client, ['page', 'revisions', 'revision', ...pageDependencies])
      if (data.slug !== slug)
        client.removeQueries({ queryKey: queryKeys.page(slug), type: 'inactive' })
      await options.onSuccess?.(data, variables, result, context)
    },
  })
}
export function useDeletePage(slug: string, options: MutationOptions<void> = {}) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: () => deletePage(slug),
    onSuccess: async (data, variables, result, context) => {
      await client.cancelQueries({ queryKey: queryKeys.page(slug), exact: true })
      await invalidateResources(client, [...pageDependencies, 'revisions', 'revision'])
      await options.onSuccess?.(data, variables, result, context)
      client.removeQueries({ queryKey: queryKeys.page(slug), exact: true })
    },
  })
}
export interface SearchResult {
  projectName?: string
  projectSlug?: string
  id: string
  title: string
  slug: string
  sectionId: string
  projectId: string
  rank: number
}
export interface SearchResponse {
  results: SearchResult[]
  page: number
  limit: number
}
export function useSearch(query: string, page = 1, limit = 20) {
  const q = query.trim()
  return useQuery({
    queryKey: queryKeys.search(q, page, limit),
    enabled: q.length >= 2,
    queryFn: ({ signal }) =>
      apiClient
        .get<SearchResponse>('/api/v2/search', { params: { q, page, limit }, signal })
        .then((r) => r.data),
  })
}
