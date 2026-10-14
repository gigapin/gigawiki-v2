import { useQuery } from '@tanstack/react-query'
import type { Activity } from '@shared/types/activity'

import { queryKeys } from './query-keys'
import apiClient from './client'

import { useAuthStore } from '@/stores/auth.store'

type ActivityWithRelations = Omit<Activity, 'user' | 'page' | 'project' | 'section'> & {
  user: { id: string; name: string }
  page: { title: string } | null
  project: { name: string } | null
  section: { title: string } | null
  subject?: { name: string } | null
}

export interface ActivitiesResponse {
  activities: ActivityWithRelations[]
  total: number
  page: number
  limit: number
}

export const fetchActivities = (
  params?: {
    page?: number
    limit?: number
    userId?: string
    resourceType?: string
    type?: string
    from?: string
    to?: string
  },
  signal?: AbortSignal,
) =>
  apiClient
    .get<ActivitiesResponse>('/api/v2/activities', { params, ...(signal ? { signal } : {}) })
    .then((r) => r.data)

export function useActivities(
  params: NonNullable<Parameters<typeof fetchActivities>[0]> = {},
  countOnly = false,
) {
  return useQuery({
    queryKey: queryKeys.activities(params, countOnly),
    queryFn: ({ signal }) => fetchActivities(params, signal),
    retry: false,
  })
}

export function useMyActivities(params: { page?: number; limit?: number } = {}, countOnly = false) {
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    enabled: Boolean(userId),
    queryKey: ['personal-activities', userId, params, countOnly],
    queryFn: ({ signal }) =>
      apiClient
        .get<ActivitiesResponse>('/api/v2/users/me/activities', { params, signal })
        .then((r) => r.data),
    retry: false,
  })
}
export function useDashboardStats(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard-stats'],
    enabled,
    queryFn: ({ signal }) =>
      apiClient
        .get<{
          users: number
          pages: number
          subjects: number
        }>('/api/v2/dashboard/stats', { signal })
        .then((r) => r.data),
  })
}
