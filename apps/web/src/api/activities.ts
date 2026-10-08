import type { Activity } from '@shared/types/activity'

import apiClient from './client'

type ActivityWithRelations = Omit<Activity, 'user' | 'page' | 'project' | 'section'> & {
  user: { id: string; name: string }
  page: { title: string } | null
  project: { name: string } | null
  section: { title: string } | null
}

interface ActivitiesResponse {
  activities: ActivityWithRelations[]
  total: number
  page: number
  limit: number
}

export const fetchActivities = (params?: {
  page?: number
  limit?: number
  userId?: string
  resourceType?: string
  type?: string
  from?: string
  to?: string
}) => apiClient.get<ActivitiesResponse>('/api/v2/activities', { params }).then((r) => r.data)
