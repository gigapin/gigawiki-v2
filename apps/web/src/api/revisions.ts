import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Revision } from '@shared/types/revision'

import { queryKeys } from './query-keys'
import apiClient from './client'
import type { PageListItem } from './pages'

export type RevisionListItem = Pick<Revision, 'id' | 'revisionNumber' | 'title' | 'summary'> & {
  createdAt: string
  createdBy: { id: string; name: string }
}
export type RevisionDetail = RevisionListItem & Pick<Revision, 'content' | 'slug' | 'pageId'>
export interface RevisionsResponse {
  revisions: RevisionListItem[]
  total: number
  page: number
  limit: number
}

export function fetchRevisions(
  slug: string,
  page = 1,
  limit = 10,
  signal?: AbortSignal,
): Promise<RevisionsResponse> {
  return apiClient
    .get<RevisionsResponse>(`/api/v2/pages/${slug}/revisions`, {
      params: { page, limit },
      ...(signal ? { signal } : {}),
    })
    .then((response) => response.data)
}
export function fetchRevision(
  slug: string,
  number: number,
  signal?: AbortSignal,
): Promise<RevisionDetail> {
  return apiClient
    .get<RevisionDetail>(`/api/v2/pages/${slug}/revisions/${number}`, { signal })
    .then((response) => response.data)
}
export function restoreRevision(slug: string, number: number): Promise<PageListItem> {
  return apiClient
    .post<PageListItem>(`/api/v2/pages/${slug}/revisions/${number}/restore`)
    .then((response) => response.data)
}
export function useRevisions(slug: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: queryKeys.revisions(slug, page, limit),
    enabled: Boolean(slug),
    queryFn: ({ signal }) => fetchRevisions(slug, page, limit, signal),
  })
}
export function useRevision(slug: string, number: number | undefined) {
  return useQuery({
    queryKey: queryKeys.revision(slug, number),
    enabled: Boolean(slug) && number !== undefined,
    queryFn: ({ signal }) => fetchRevision(slug, number!, signal),
  })
}
export function useRestoreRevision(slug: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (number: number) => restoreRevision(slug, number),
    onSuccess: async (page) => {
      // Prevent a pending response from putting the pre-restore page back in cache.
      await client.cancelQueries({ queryKey: queryKeys.page(slug), exact: true })
      await Promise.all(
        [
          'page',
          'pages',
          'revisions',
          'revision',
          'sections',
          'section',
          'project',
          'subject',
          'subjects',
          'favorites',
          'search',
          'activities',
          'activities-count',
          'stats',
        ].map((key) =>
          client.invalidateQueries({ queryKey: queryKeys.root(key), refetchType: 'none' }),
        ),
      )
      if (page.slug !== slug)
        client.removeQueries({ queryKey: queryKeys.page(slug), exact: true, type: 'inactive' })
    },
  })
}
