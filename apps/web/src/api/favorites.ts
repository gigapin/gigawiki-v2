import type { Favorite } from '@shared/types/favorite'

import apiClient from './client'

interface FavoritesResponse {
  favorites: Favorite[]
  total: number
  page: number
  limit: number
}

export const fetchFavorites = (params?: { page?: number; limit?: number }) =>
  apiClient.get<FavoritesResponse>('/api/v2/favorites', { params }).then((r) => r.data)
