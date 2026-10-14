import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { CommentResource } from './comments'
import apiClient from './client'

export type ResourceMetadataAction = {
  type: 'favorite' | 'tag' | 'remove'
  id?: string
  name?: string
}
export function useResourceMetadata(resource: CommentResource) {
  const client = useQueryClient()
  const key =
    resource.type === 'projects'
      ? 'projectId'
      : resource.type === 'sections'
        ? 'sectionId'
        : 'pageId'
  return useMutation({
    mutationFn: async (action: ResourceMetadataAction): Promise<void> => {
      if (action.type === 'favorite')
        await apiClient.post('/api/v2/favorites', { [key]: resource.id })
      else if (action.type === 'remove') await apiClient.delete(`/api/v2/tags/${action.id}`)
      else
        await apiClient.post('/api/v2/tags', {
          [key]: resource.id,
          name: action.name?.trim().toLowerCase(),
        })
    },
    onSuccess: async () => {
      await Promise.all(
        ['subject', 'project', 'section', 'sections', 'favorites', 'favorites-count', 'tags'].map(
          (root) => client.invalidateQueries({ queryKey: [root] }),
        ),
      )
    },
  })
}
