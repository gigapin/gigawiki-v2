import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Revision } from '@shared/types/revision'

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

export function fetchRevisions(slug: string, page = 1, limit = 10): Promise<RevisionsResponse> {
  return apiClient
    .get<RevisionsResponse>(`/api/v2/pages/${slug}/revisions`, { params: { page, limit } })
    .then((response) => response.data)
}
export function fetchRevision(slug: string, number: number): Promise<RevisionDetail> {
  return apiClient
    .get<RevisionDetail>(`/api/v2/pages/${slug}/revisions/${number}`)
    .then((response) => response.data)
}
export function restoreRevision(slug: string, number: number): Promise<PageListItem> {
  return apiClient
    .post<PageListItem>(`/api/v2/pages/${slug}/revisions/${number}/restore`)
    .then((response) => response.data)
}
export function useRevisions(slug: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['revisions', slug, page, limit],
    queryFn: () => fetchRevisions(slug, page, limit),
  })
}
export function useRevision(slug: string, number: number | undefined) {
  return useQuery({
    queryKey: ['revision', slug, number],
    enabled: number !== undefined,
    queryFn: () => fetchRevision(slug, number!),
  })
}
export function useRestoreRevision(slug: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (number: number) => restoreRevision(slug, number),
    onSuccess: async (page) => {
      // Prevent a pending response from putting the pre-restore page back in cache.
      await client.cancelQueries({ queryKey: ['page', slug], exact: true })
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
        ].map((key) => client.invalidateQueries({ queryKey: [key], refetchType: 'none' })),
      )
      if (page.slug !== slug)
        client.removeQueries({ queryKey: ['page', slug], exact: true, type: 'inactive' })
    },
  })
}
