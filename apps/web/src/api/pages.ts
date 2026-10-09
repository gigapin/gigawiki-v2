import { useQuery } from '@tanstack/react-query'
import type { Page } from '@shared/types/page'

import apiClient from './client'

export type PageListItem = Pick<
  Page,
  'id' | 'title' | 'slug' | 'isDraft' | 'restricted' | 'visibility' | 'updatedAt'
> & {
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
    queryKey: ['pages', 'section', sectionSlug, page, limit],
    enabled: Boolean(sectionSlug),
    queryFn: () =>
      apiClient
        .get<PagesResponse>(`/api/v2/sections/${sectionSlug}/pages`, { params: { page, limit } })
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
  title: string
  content: string
  isDraft: boolean
  visibility: 'PUBLIC' | 'PRIVATE'
}
export function fetchPage(slug: string): Promise<PageDetail> {
  return apiClient.get<PageDetail>(`/api/v2/pages/${slug}`).then((r) => r.data)
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
