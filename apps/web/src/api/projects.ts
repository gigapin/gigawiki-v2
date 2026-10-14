import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Project } from '@shared/types/project'
import type { Tag } from '@shared/types/tag'

import { queryKeys } from './query-keys'
import type { MutationOptions, ReadOptions } from './hook-options'
import { invalidateResources, subjectDependencies } from './cache'
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
  signal?: AbortSignal,
): Promise<ProjectsPageResponse> {
  return apiClient
    .get<ProjectsPageResponse>(`/api/v2/subjects/${subjectSlug}/projects`, {
      params,
      ...(signal ? { signal } : {}),
    })
    .then((r) => r.data)
}

export type ProjectDetail = Project & {
  _count?: { favorites: number }
  tags: Tag[]
  subject: { name: string; slug: string }
}
export type ProjectInput = {
  subjectId?: string
  name: string
  description: string
  visibility: 'PUBLIC' | 'PRIVATE'
  imageId?: string | null
}

export function fetchProject(slug: string, signal?: AbortSignal): Promise<ProjectDetail> {
  return (
    signal
      ? apiClient.get<ProjectDetail>(`/api/v2/projects/${slug}`, { signal })
      : apiClient.get<ProjectDetail>(`/api/v2/projects/${slug}`)
  ).then((response) => response.data)
}

export function createProject(input: ProjectInput & { subjectId: string }): Promise<Project> {
  return apiClient.post<Project>('/api/v2/projects', input).then((response) => response.data)
}

export function updateProject(slug: string, input: ProjectInput): Promise<Project> {
  return apiClient
    .patch<Project>(`/api/v2/projects/${slug}`, input)
    .then((response) => response.data)
}

export function deleteProject(slug: string): Promise<void> {
  return apiClient.delete(`/api/v2/projects/${slug}`).then(() => undefined)
}

export function useProjects(
  subjectSlug: string | undefined,
  params: { page?: number; limit?: number } = {},
  options: ReadOptions & { keepPreviousData?: boolean } = {},
) {
  const { keepPreviousData, ...readOptions } = options
  return useQuery({
    queryKey: queryKeys.projects(subjectSlug, params),
    queryFn: ({ signal }) => fetchProjectsBySubject(subjectSlug!, params, signal),
    placeholderData: keepPreviousData ? (previous) => previous : undefined,
    ...readOptions,
    enabled: Boolean(subjectSlug) && options.enabled !== false,
  })
}
export function useProject(slug: string, options: ReadOptions = {}) {
  return useQuery({
    queryKey: queryKeys.project(slug),
    queryFn: ({ signal }) => fetchProject(slug, signal),
    ...options,
    enabled: Boolean(slug) && options.enabled !== false,
  })
}
export function useSaveProject(
  prepare: () => Promise<ProjectInput & { subjectId: string }>,
  slug?: string,
  _subjectSlug?: string,
  options: MutationOptions<Project> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: async () => {
      const { subjectId, ...input } = await prepare()
      return slug
        ? updateProject(slug, { ...input, subjectId })
        : createProject({ ...input, subjectId })
    },
    onSuccess: async (saved, variables, result, context) => {
      if (slug) {
        await client.cancelQueries({ queryKey: queryKeys.project(slug), exact: true })
        const previous = client.getQueryData<ProjectDetail>(queryKeys.project(slug))
        if (previous) client.setQueryData(queryKeys.project(saved.slug), { ...previous, ...saved })
        if (saved.slug !== slug)
          client.removeQueries({ queryKey: queryKeys.project(slug), type: 'inactive' })
      }
      await invalidateResources(client, [
        'dashboard-stats',
        'personal-activities',
        'project',
        'pages',
        'page',
        'favorites',
        'views',
        'search',
      ])
      await Promise.all([
        client.invalidateQueries({
          queryKey: queryKeys.root('subject'),
        }),
        client.invalidateQueries({ queryKey: queryKeys.root('subjects') }),
      ])
      await options.onSuccess?.(saved, variables, result, context)
    },
  })
}
export function useCreateProject(
  options: MutationOptions<Project, ProjectInput & { subjectId: string }> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: createProject,
    onSuccess: async (data, variables, result, context) => {
      await invalidateResources(client, ['subject', 'subjects', 'stats'], 'active')
      await options.onSuccess?.(data, variables, result, context)
    },
  })
}
export function useUpdateProject(
  slug: string,
  options: MutationOptions<Project, ProjectInput> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: (input: ProjectInput) => updateProject(slug, input),
    onSuccess: async (data, variables, result, context) => {
      await client.cancelQueries({ queryKey: queryKeys.project(slug), exact: true })
      await invalidateResources(client, subjectDependencies)
      if (data.slug !== slug)
        client.removeQueries({ queryKey: queryKeys.project(slug), type: 'inactive' })
      await options.onSuccess?.(data, variables, result, context)
    },
  })
}
export function useDeleteProject(
  slug: string,
  options: MutationOptions<Awaited<ReturnType<typeof deleteProject>>> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: () => deleteProject(slug),
    onSuccess: async (data, variables, result, context) => {
      await client.cancelQueries({ queryKey: queryKeys.project(slug), exact: true })
      await invalidateResources(client, subjectDependencies)
      await options.onSuccess?.(data, variables, result, context)
      client.removeQueries({ queryKey: queryKeys.project(slug), exact: true })
    },
  })
}
