import { useQuery } from '@tanstack/react-query'

import apiClient from './client'

import { useAuthStore } from '@/stores/auth.store'

export interface RecentView {
  id: string
  count: number
  lastSeenAt: string
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

export function useRecentViews(limit = 6) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['views', userId, 1, limit],
    enabled: Boolean(userId),
    staleTime: 0,
    queryFn: ({ signal }) =>
      apiClient
        .get<ViewsResponse>('/api/v2/views', { params: { page: 1, limit }, signal })
        .then((r) => r.data),
  })
}
