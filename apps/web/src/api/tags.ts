import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import apiClient from './client'

export function useTagSearch(prefix: string) {
  return useQuery({
    queryKey: ['tags', prefix],
    enabled: Boolean(prefix.trim()),
    queryFn: ({ signal }) =>
      apiClient
        .get<
          { id: string; name: string }[]
        >('/api/v2/tags', { params: { name: prefix.trim() }, signal })
        .then((r) => r.data),
  })
}
export function usePageTags(slug: string, pageId: string) {
  const client = useQueryClient()
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['page', slug], exact: true }),
      client.invalidateQueries({ queryKey: ['tags'] }),
    ])
  }
  const create = useMutation({
    mutationFn: (name: string) =>
      apiClient.post('/api/v2/tags', { name: name.trim().toLowerCase(), pageId }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v2/tags/${id}`),
    onSuccess: refresh,
  })
  return { create, remove }
}
