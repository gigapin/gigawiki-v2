export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

export type PaginatedResponse<T, Key extends string = 'data'> = PaginationMeta & Record<Key, T[]>
export interface ApiErrorResponse {
  error: string
  code: string
  details?: unknown
}
export type ApiResponse<T> = T | ApiErrorResponse
