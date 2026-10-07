import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Section } from '@shared/types/section'

import apiClient from './client'

export type SectionWithCount = Section & { _count: { pages: number } }
export type SectionInput = { title: string; description: string; visibility: 'PUBLIC' | 'PRIVATE' }

export function useSections(projectSlug: string) {
  return useQuery({
    queryKey: ['sections', projectSlug],
    enabled: Boolean(projectSlug),
    queryFn: () =>
      apiClient
        .get<{ sections: SectionWithCount[] }>(`/api/v2/projects/${projectSlug}/sections`)
        .then((response) => response.data.sections),
  })
}

export function useSectionMutations(projectSlug: string) {
  const client = useQueryClient()
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['sections', projectSlug] }),
      client.invalidateQueries({ queryKey: ['project', projectSlug] }),
    ])
  }
  const save = useMutation({
    mutationFn: ({
      slug,
      projectId,
      ...input
    }: SectionInput & { slug?: string; projectId: string }) =>
      (slug
        ? apiClient.patch<Section>(`/api/v2/sections/${slug}`, input)
        : apiClient.post<Section>('/api/v2/sections', { ...input, projectId })
      ).then((response) => response.data),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (slug: string) => apiClient.delete(`/api/v2/sections/${slug}`),
    onSuccess: invalidate,
  })
  const reorder = useMutation({
    mutationFn: (sections: SectionWithCount[]) =>
      apiClient.patch(`/api/v2/sections/${sections[0].slug}/position`, {
        positions: sections.map((section, position) => ({ id: section.id, position })),
      }),
    onSuccess: invalidate,
  })
  return { save, remove, reorder }
}
