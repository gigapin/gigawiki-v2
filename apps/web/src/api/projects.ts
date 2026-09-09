import type { Project } from '@shared/types/project'
import type { Tag } from '@shared/types/tag'

import apiClient from './client'

export type ProjectWithMeta = Project & {
  tags: Tag[]
  _count: { sections: number; pages: number; views: number }
}

export interface ProjectsPageResponse {
  projects: ProjectWithMeta[]
  total: number
  page: number
  limit: number
}

export function fetchProjectsBySubject(
  subjectSlug: string,
  params?: { page?: number; limit?: number },
): Promise<ProjectsPageResponse> {
  return apiClient
    .get<ProjectsPageResponse>(`/api/v2/subjects/${subjectSlug}/projects`, { params })
    .then((r) => r.data)
}
