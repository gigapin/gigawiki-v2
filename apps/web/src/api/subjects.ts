import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Subject } from '@shared/types/subject'

import { queryKeys } from './query-keys'
import type { MutationOptions, ReadOptions } from './hook-options'
import { invalidateResources, subjectDependencies } from './cache'
import apiClient from './client'

export interface SubjectsResponse {
  subjects: (Subject & { _count: { projects: number } })[]
  total: number
  page: number
  limit: number
}

export const fetchSubjects = (params?: SubjectsParams, signal?: AbortSignal) =>
  apiClient
    .get<SubjectsResponse>('/api/v2/subjects', { params, ...(signal ? { signal } : {}) })
    .then((r) => r.data)

export const createSubject = (body: {
  name: string
  description?: string
  color?: string
  icon?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
  imageId?: string | null
}) => apiClient.post<Subject>('/api/v2/subjects', body).then((r) => r.data)

export type SubjectInput = {
  name: string
  description: string
  visibility: 'PUBLIC' | 'PRIVATE'
  color: string
  icon: string
  imageId?: string | null
}
export const updateSubject = (slug: string, input: SubjectInput) =>
  apiClient.patch<Subject>(`/api/v2/subjects/${slug}`, input).then((r) => r.data)
export const deleteSubject = (slug: string) =>
  apiClient.delete(`/api/v2/subjects/${slug}`).then(() => undefined)

export type SubjectsParams = { page?: number; limit?: number; visibility?: string }
export type SubjectDetail = Subject & {
  user: { id: string; name: string }
  _count: { projects: number }
}
export function fetchSubject(slug: string, signal?: AbortSignal) {
  return apiClient.get<SubjectDetail>(`/api/v2/subjects/${slug}`, { signal }).then((r) => r.data)
}
export function useSubjects(params: SubjectsParams = { limit: 50 }, options: ReadOptions = {}) {
  return useQuery({
    queryKey: queryKeys.subjects(params),
    queryFn: ({ signal }) => fetchSubjects(params, signal),
    ...options,
  })
}
export function useSubject(slug: string, options: ReadOptions = {}) {
  return useQuery({
    queryKey: queryKeys.subject(slug),
    queryFn: ({ signal }) => fetchSubject(slug, signal),
    ...options,
    enabled: Boolean(slug) && options.enabled !== false,
  })
}
export function useSaveSubject(
  prepare: () => Promise<SubjectInput>,
  slug?: string,
  options: MutationOptions<Subject> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: async () => {
      const input = await prepare()
      return slug ? updateSubject(slug, input) : createSubject(input)
    },
    onSuccess: async (saved, variables, result, context) => {
      if (slug) await client.cancelQueries({ queryKey: queryKeys.subject(slug), exact: true })
      await invalidateResources(client, subjectDependencies)
      if (slug && slug !== saved.slug)
        client.removeQueries({ queryKey: queryKeys.subject(slug), type: 'inactive' })
      await client.invalidateQueries({ queryKey: queryKeys.root('subjects') })
      await options.onSuccess?.(saved, variables, result, context)
    },
  })
}
export function useCreateSubject(options: MutationOptions<Subject, SubjectInput> = {}) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: createSubject,
    onSuccess: async (data, variables, result, context) => {
      await invalidateResources(client, ['subjects', 'stats'], 'active')
      await options.onSuccess?.(data, variables, result, context)
    },
  })
}
export function useUpdateSubject(
  slug: string,
  options: MutationOptions<Subject, SubjectInput> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: (input: SubjectInput) => updateSubject(slug, input),
    onSuccess: async (data, variables, result, context) => {
      await client.cancelQueries({ queryKey: queryKeys.subject(slug), exact: true })
      await invalidateResources(client, subjectDependencies)
      if (data.slug !== slug)
        client.removeQueries({ queryKey: queryKeys.subject(slug), type: 'inactive' })
      await client.invalidateQueries({ queryKey: queryKeys.root('subjects') })
      await options.onSuccess?.(data, variables, result, context)
    },
  })
}
export function useDeleteSubject(slug: string, options: MutationOptions<void> = {}) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: () => deleteSubject(slug),
    onSuccess: async (data, variables, result, context) => {
      await client.cancelQueries({ queryKey: queryKeys.subject(slug) })
      await invalidateResources(client, subjectDependencies)
      await options.onSuccess?.(data, variables, result, context)
      client.removeQueries({ queryKey: queryKeys.subject(slug) })
    },
  })
}
