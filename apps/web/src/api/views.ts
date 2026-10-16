import { useQuery } from '@tanstack/react-query'

import { queryKeys } from './query-keys'
import apiClient from './client'

import { useAuthStore } from '@/stores/auth.store'

export interface RecentView {
  id: string
  count: number
  lastSeenAt: string
  subject?: { id: string; name: string; slug: string } | null
  page: { id: string; title: string; slug: string } | null
  project: { id: string; name: string; slug: string } | null
  section: { id: string; title: string; slug: string; project: { slug: string } } | null
}
export interface ViewsResponse {
  views: RecentView[]
  total: number
  page: number
  limit: number
}

export function useRecentViews(limit = 6, ranking: 'recent' | 'popular' = 'recent') {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey:
      ranking === 'popular'
        ? [...queryKeys.views(userId, limit), ranking]
        : queryKeys.views(userId, limit),
    enabled: Boolean(userId),
    staleTime: 0,
    queryFn: ({ signal }) =>
      apiClient
        .get<ViewsResponse>('/api/v2/views', {
          params: { page: 1, limit, ...(ranking === 'popular' ? { ranking } : {}) },
          signal,
        })
        .then((r) => r.data),
  })
}
