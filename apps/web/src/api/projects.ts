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

export type ProjectDetail = Project & { tags: Tag[]; subject: { name: string; slug: string } }
export type ProjectInput = { name: string; description: string; visibility: 'PUBLIC' | 'PRIVATE' }

export function fetchProject(slug: string): Promise<ProjectDetail> {
  return apiClient.get<ProjectDetail>(`/api/v2/projects/${slug}`).then((response) => response.data)
}

export function createProject(input: ProjectInput & { subjectId: string }): Promise<Project> {
  return apiClient.post<Project>('/api/v2/projects', input).then((response) => response.data)
}

export function updateProject(slug: string, input: ProjectInput): Promise<Project> {
  return apiClient
    .patch<Project>(`/api/v2/projects/${slug}`, input)
    .then((response) => response.data)
}

export function deleteProject(slug: string) {
  return apiClient.delete(`/api/v2/projects/${slug}`)
}
