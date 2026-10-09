import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Favorite } from '@shared/types/favorite'

import type { PageDetail } from './pages'
import apiClient from './client'

interface FavoritesResponse {
  favorites: Favorite[]
  total: number
  page: number
  limit: number
}

export const fetchFavorites = (params?: { page?: number; limit?: number }) =>
  apiClient.get<FavoritesResponse>('/api/v2/favorites', { params }).then((r) => r.data)

export function useToggleFavorite(slug: string, pageId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ favorited: boolean }>('/api/v2/favorites', { pageId }).then((r) => r.data),
    onSuccess: async ({ favorited }) => {
      await client.cancelQueries({ queryKey: ['page', slug], exact: true })
      client.setQueryData<PageDetail>(['page', slug], (current) =>
        current
          ? {
              ...current,
              favorited,
              _count: {
                ...current._count,
                favorites:
                  current._count.favorites +
                  (current.favorited === favorited ? 0 : favorited ? 1 : -1),
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
