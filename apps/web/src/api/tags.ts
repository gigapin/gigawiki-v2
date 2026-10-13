import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from './query-keys'
import apiClient from './client'

export function useTagSearch(prefix: string) {
  return useQuery({
    queryKey: queryKeys.tags(prefix),
    enabled: Boolean(prefix.trim()),
    queryFn: ({ signal }) =>
      apiClient
        .get<
          { id: string; name: string }[]
        >('/api/v2/tags', { params: { name: prefix.trim() }, signal })
        .then((r) => r.data),
  })
}

function useTagInvalidation(slug: string) {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.page(slug), exact: true }),
      client.invalidateQueries({ queryKey: queryKeys.root('tags') }),
    ])
}
export function useCreateTag(slug: string, pageId: string) {
  const refresh = useTagInvalidation(slug)
  return useMutation({
    mutationFn: (name: string) =>
      apiClient
        .post<{
          id: string
          name: string
        }>('/api/v2/tags', { name: name.trim().toLowerCase(), pageId })
        .then((r) => r.data),
    onSuccess: refresh,
  })
}
export function useDeleteTag(slug: string) {
  const refresh = useTagInvalidation(slug)
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v2/tags/${id}`).then(() => undefined),
    onSuccess: refresh,
  })
}
export function usePageTags(slug: string, pageId: string) {
  return { create: useCreateTag(slug, pageId), remove: useDeleteTag(slug) }
}
