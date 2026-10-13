import { useQuery } from '@tanstack/react-query'
import type { Activity } from '@shared/types/activity'

import { queryKeys } from './query-keys'
import apiClient from './client'

type ActivityWithRelations = Omit<Activity, 'user' | 'page' | 'project' | 'section'> & {
  user: { id: string; name: string }
  page: { title: string } | null
  project: { name: string } | null
  section: { title: string } | null
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
