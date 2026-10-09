import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Favorite } from '@shared/types/favorite'

import type { PageDetail } from './pages'
import apiClient from './client'

import { useAuthStore } from '@/stores/auth.store'

interface FavoritesResponse {
  favorites: Favorite[]
  total: number
  page: number
  limit: number
}

export const fetchFavorites = (params?: { page?: number; limit?: number }, signal?: AbortSignal) =>
  apiClient.get<FavoritesResponse>('/api/v2/favorites', { params, signal }).then((r) => r.data)

export function useFavorites(params: { page?: number; limit?: number } = {}, countOnly = false) {
  const userId = useAuthStore((state) => state.user?.id)
  const { page = 1, limit = 20 } = params
  return useQuery({
    queryKey: [countOnly ? 'favorites-count' : 'favorites', userId, page, limit],
    enabled: Boolean(userId),
    queryFn: ({ signal }) => fetchFavorites({ page, limit }, signal),
  })
}

export function useToggleFavorite(slug: string, pageId: string) {
  const client = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ favorited: boolean }>('/api/v2/favorites', { pageId }).then((r) => r.data),
    onSuccess: async ({ favorited }) => {
      if (useAuthStore.getState().user?.id !== userId) return
      await client.cancelQueries({ queryKey: ['page', slug], exact: true })
      if (useAuthStore.getState().user?.id !== userId) return
      client.setQueryData<PageDetail>(['page', slug], (current) =>
        current
          ? {
              ...current,
              favorited,
              _count: {
                ...current._count,
                favorites: favorited ? 1 : 0,
              },
            }
          : current,
      )
      await Promise.all(
        ['favorites', 'favorites-count'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      )
    },
  })
}
