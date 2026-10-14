import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Section } from '@shared/types/section'

import { queryKeys } from './query-keys'
import apiClient from './client'

export type SectionWithCount = Section & {
  tags?: { id: string; name: string; userId: string }[]
  favorites?: { id: string }[]
  _count: { pages: number }
}
export type SectionInput = { title: string; description: string; visibility: 'PUBLIC' | 'PRIVATE' }

export function useSections(projectSlug: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sections(projectSlug),
    enabled: Boolean(projectSlug) && enabled,
    queryFn: ({ signal }) =>
      apiClient
        .get<{
          sections: SectionWithCount[]
        }>(`/api/v2/projects/${projectSlug}/sections`, { signal })
        .then((response) => response.data.sections),
  })
}

function useSectionInvalidation(projectSlug: string) {
  const client = useQueryClient()
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.sections(projectSlug) }),
      client.invalidateQueries({ queryKey: queryKeys.project(projectSlug) }),
      client.invalidateQueries({ queryKey: queryKeys.root('section'), refetchType: 'none' }),
      client.invalidateQueries({ queryKey: queryKeys.root('page'), refetchType: 'none' }),
      client.invalidateQueries({ queryKey: queryKeys.root('views'), refetchType: 'none' }),
      client.invalidateQueries({ queryKey: queryKeys.root('favorites'), refetchType: 'none' }),
      client.invalidateQueries({ queryKey: queryKeys.root('subject'), refetchType: 'none' }),
      client.invalidateQueries({ queryKey: queryKeys.root('subjects'), refetchType: 'none' }),
    ])
  }
}
function useSaveSection(projectSlug: string) {
  const invalidate = useSectionInvalidation(projectSlug)
  return useMutation({
    mutationFn: ({
      slug,
      projectId,
      ...input
    }: SectionInput & { slug?: string; projectId: string }) =>
      (slug
        ? apiClient.patch<Section>(`/api/v2/sections/${slug}`, input)
        : apiClient.post<Section>('/api/v2/sections', { ...input, projectId })
      ).then((r) => r.data),
    onSuccess: invalidate,
  })
}
export function useSectionMutations(projectSlug: string) {
  return {
    save: useSaveSection(projectSlug),
    remove: useDeleteSection(projectSlug),
    reorder: useReorderSections(projectSlug),
  }
}
export function useSection(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.section(slug),
    enabled: Boolean(slug),
    queryFn: ({ signal }) =>
      apiClient.get<SectionWithCount>(`/api/v2/sections/${slug}`, { signal }).then((r) => r.data),
  })
}
export function useCreateSection(projectSlug: string) {
  const invalidate = useSectionInvalidation(projectSlug)
  return useMutation({
    mutationFn: (input: SectionInput & { projectId: string }) =>
      apiClient.post<Section>('/api/v2/sections', input).then((r) => r.data),
    onSuccess: invalidate,
  })
}
export function useUpdateSection(projectSlug: string) {
  const invalidate = useSectionInvalidation(projectSlug)
  return useMutation({
    mutationFn: ({ slug, ...input }: SectionInput & { slug: string }) =>
      apiClient.patch<Section>(`/api/v2/sections/${slug}`, input).then((r) => r.data),
    onSuccess: invalidate,
  })
}
export function useDeleteSection(projectSlug: string) {
  const client = useQueryClient()
  const invalidate = useSectionInvalidation(projectSlug)
  return useMutation({
    mutationFn: (slug: string) =>
      apiClient.delete(`/api/v2/sections/${slug}`).then(() => undefined),
    onSuccess: async (_, slug) => {
      await client.cancelQueries({ queryKey: queryKeys.section(slug), exact: true })
      client.removeQueries({ queryKey: queryKeys.section(slug), exact: true })
      await invalidate()
      await Promise.all(
        ['pages', 'page', 'views', 'favorites', 'favorites-count', 'search', 'stats'].map(
          (resource) =>
            client.invalidateQueries({ queryKey: queryKeys.root(resource), refetchType: 'none' }),
        ),
      )
    },
  })
}
export function useReorderSections(projectSlug: string) {
  const invalidate = useSectionInvalidation(projectSlug)
  return useMutation({
    mutationFn: (sections: SectionWithCount[]) => {
      if (!sections.length) return Promise.resolve()
      return apiClient
        .patch(`/api/v2/sections/${sections[0].slug}/position`, {
          positions: sections.map((section, position) => ({ id: section.id, position })),
        })
        .then(() => undefined)
    },
    onSuccess: invalidate,
  })
}
