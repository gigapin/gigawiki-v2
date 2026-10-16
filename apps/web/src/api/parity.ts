import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import apiClient from './client'

import { useAuthStore } from '@/stores/auth.store'

export type ResourceLink = {
  id: string
  name?: string
  title?: string
  slug: string
  project?: { slug: string }
}
export type Association = {
  id: string
  name?: string
  page?: ResourceLink | null
  project?: ResourceLink | null
  section?: ResourceLink | null
  subject?: ResourceLink | null
  pageId?: string
  projectId?: string
  sectionId?: string
}
export type PageResult<T, K extends string> = {
  total: number
  page: number
  limit: number
} & Record<K, T[]>
export function useParityRead<T>(
  root: string,
  path: string,
  params: Record<string, unknown> = {},
  enabled = true,
  poll = false,
) {
  const authenticated = useAuthStore((state) => Boolean(state.user?.id))
  return useQuery({
    queryKey: [root, path, params],
    enabled: enabled && authenticated,
    queryFn: ({ signal }) =>
      apiClient.get<T>('/api/v2' + path, { params, signal }).then((r) => r.data),
    refetchInterval: poll
      ? (query) =>
          ['completed', 'failed'].includes(
            (query.state.data as { state?: string } | undefined)?.state ?? '',
          )
            ? false
            : 2000
      : false,
  })
}
export function useParityAction<T = unknown, I = unknown>(
  path: string,
  method: 'post' | 'patch' = 'post',
) {
  const client = useQueryClient()
  return useMutation({
    gcTime: 0,
    mutationFn: (body: I) =>
      apiClient.request<T>({ url: '/api/v2' + path, method, data: body }).then((r) => r.data),
    onSuccess: () => client.invalidateQueries(),
  })
}
export function usePDF(slug: string) {
  return useMutation({
    mutationFn: async () => {
      try {
        const response = await apiClient.get(
          `/api/v2/pages/${encodeURIComponent(slug)}/export/pdf`,
          { responseType: 'blob', timeout: 35000 },
        )
        const url = URL.createObjectURL(response.data)
        const anchor = document.createElement('a')
        anchor.href = url
        const match = /filename\*=UTF-8''([^;]+)/i.exec(
          response.headers['content-disposition'] ?? '',
        )
        anchor.download = match ? decodeURIComponent(match[1]) : 'page.pdf'
        anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch (error) {
        const response = (error as { response?: { data: unknown } }).response
        if (response?.data instanceof Blob) {
          try {
            response.data = JSON.parse(await response.data.text())
          } catch {
            /* retain original error */
          }
        }
        throw error
      }
    },
  })
}
export function completeInitialPassword(passwordChangeToken: string, newPassword: string) {
  return apiClient
    .post('/api/v2/auth/complete-initial-password', { passwordChangeToken, newPassword })
    .then((r) => r.data)
}

export function useCompleteInitialPassword() {
  return useMutation({
    mutationFn: (input: { passwordChangeToken: string; newPassword: string }) =>
      completeInitialPassword(input.passwordChangeToken, input.newPassword),
  })
}
