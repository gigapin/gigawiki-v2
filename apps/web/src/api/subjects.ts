import type { Subject } from '@shared/types/subject'

import apiClient from './client'

interface SubjectsResponse {
  subjects: (Subject & { _count: { projects: number } })[]
  total: number
  page: number
  limit: number
}

export const fetchSubjects = (params?: { page?: number; limit?: number; visibility?: string }) =>
  apiClient.get<SubjectsResponse>('/api/v2/subjects', { params }).then((r) => r.data)

export const createSubject = (body: {
  name: string
  description?: string
  color?: string
  icon?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}) => apiClient.post<Subject>('/api/v2/subjects', body).then((r) => r.data)
