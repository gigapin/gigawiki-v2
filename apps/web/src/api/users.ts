import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import type { InviteDto } from '@shared/schemas/auth.schema'

import { queryKeys } from './query-keys'
import type { MutationOptions } from './hook-options'
import { invalidateResources, subjectDependencies } from './cache'
import apiClient from './client'

import { useAuthStore } from '@/stores/auth.store'

export function useInviteUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: InviteDto) =>
      apiClient
        .post<{
          invite: {
            id: string
            email: string
            role: InviteDto['role']
            expiresAt: string
          }
        }>('/api/v2/users/invite', input)
        .then((r) => r.data.invite),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.root('admin-invites') }),
  })
}
export function invitationSavedWithoutEmail(error: unknown) {
  return (
    isAxiosError<{ code?: string }>(error) &&
    error.response?.data?.code === 'INVITE_DELIVERY_FAILED'
  )
}

export type ProfileResult = import('@shared/types/user').User & {
  verificationDeliveryFailed?: boolean
}
export async function updateProfile(input: { name: string; email: string }) {
  return apiClient.patch<ProfileResult>('/api/v2/users/me', input).then((r) => r.data)
}
export async function uploadAvatar(file: File) {
  const body = new FormData()
  body.append('file', file)
  return apiClient.post<ProfileResult>('/api/v2/users/me/avatar', body).then((r) => r.data)
}

export type AdminUser = import('@shared/types/user').User
export interface UserList {
  users: AdminUser[]
  total: number
  page: number
  limit: number
}
export interface InviteItem {
  id: string
  email: string
  role: import('@shared/types/user').Role
  expiresAt: string
  createdAt: string
}
export interface DeletionPreview {
  user: { id: string; name: string; email: string }
  fingerprint: string
  counts: Record<string, number>
}
export type UsersParams = {
  page?: number
  limit?: number
  search?: string
  role?: AdminUser['role']
}
export function useUsers(pageOrParams: number | UsersParams = {}, search = '') {
  const params =
    typeof pageOrParams === 'number'
      ? { page: pageOrParams, limit: 20, search }
      : { page: 1, limit: 20, ...pageOrParams }
  return useQuery({
    enabled: useAuthStore((s) => s.user?.role === 'ADMIN'),
    queryKey: queryKeys.users(params),
    queryFn: ({ signal }) =>
      apiClient.get<UserList>('/api/v2/users', { params, signal }).then((r) => r.data),
  })
}
export function useUpdateRole() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminUser['role'] }) =>
      apiClient.patch<AdminUser>(`/api/v2/users/${id}`, { role }).then((r) => r.data),
    onSuccess: (user) => {
      const state = useAuthStore.getState()
      if (state.user?.id === user.id && state.accessToken) state.setAuth(user, state.accessToken)
      void client.invalidateQueries({ queryKey: queryKeys.root('admin-users') })
    },
  })
}
export function useDeletionPreview(id: string | null) {
  return useQuery({
    queryKey: queryKeys.deletionPreview(id),
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: ({ signal }) =>
      apiClient
        .get<DeletionPreview>(`/api/v2/users/${id}/deletion-preview`, { signal })
        .then((r) => r.data),
  })
}
export function useDeleteUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fingerprint }: { id: string; fingerprint: string }) =>
      apiClient.delete(`/api/v2/users/${id}`, { data: { fingerprint } }),
    onSuccess: () =>
      invalidateResources(
        client,
        [
          ...subjectDependencies,
          'admin-users',
          'user',
          'me',
          'comments',
          'revisions',
          'revision',
          'tags',
          'admin-invites',
          'user-deletion-preview',
        ],
        'active',
      ),
  })
}
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      apiClient.patch<{ message: string }>('/api/v2/users/me', input).then((r) => r.data),
  })
}
export function useInvites(page: number) {
  return useQuery({
    enabled: useAuthStore((s) => s.user?.role === 'ADMIN'),
    queryKey: queryKeys.invites(page),
    queryFn: ({ signal }) =>
      apiClient
        .get<{
          invites: InviteItem[]
          total: number
          limit: number
        }>('/api/v2/users/invites', { params: { page, limit: 20 }, signal })
        .then((r) => r.data),
  })
}
export function useResendInvite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ message: string }>(`/api/v2/users/invites/${id}/resend`).then((r) => r.data),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.root('admin-invites') }),
  })
}
export function useCancelInvite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v2/users/invites/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.root('admin-invites') }),
  })
}

export type ProfileInput = { name: string; email: string; file?: File | null }
export function useSaveProfile(
  options: {
    onProfileSaved?: (user: ProfileResult) => void
    onAvatarSaved?: () => void
    onAvatarError?: (error: unknown) => void
  } = {},
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, email, file }: ProfileInput) => {
      const accountId = useAuthStore.getState().user?.id
      const sync = (updated: ProfileResult) => {
        const state = useAuthStore.getState()
        if (state.user?.id !== accountId || !state.accessToken) return false
        state.setAuth(updated, state.accessToken)
        client.setQueryData(queryKeys.me(accountId), updated)
        void invalidateResources(
          client,
          [
            'me',
            'user',
            'admin-users',
            'comments',
            'activities',
            'activities-count',
            'pages',
            'page',
          ],
          'active',
        )
        return true
      }
      const updated = await updateProfile({ name: name.trim(), email: email.trim().toLowerCase() })
      if (!sync(updated)) return updated
      options.onProfileSaved?.(updated)
      if (file) {
        try {
          const avatar = await uploadAvatar(file)
          if (sync(avatar)) options.onAvatarSaved?.()
          return avatar
        } catch (cause) {
          if (useAuthStore.getState().user?.id === accountId) options.onAvatarError?.(cause)
          throw cause
        }
      }
      return updated
    },
  })
}
export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.user(id),
    enabled: Boolean(id),
    queryFn: ({ signal }) =>
      apiClient.get<AdminUser>(`/api/v2/users/${id}`, { signal }).then((r) => r.data),
  })
}
export function useUpdateUser(
  id: string,
  options: MutationOptions<AdminUser, Partial<Pick<AdminUser, 'name' | 'email' | 'role'>>> = {},
) {
  const client = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: (input: Partial<Pick<AdminUser, 'name' | 'email' | 'role'>>) =>
      apiClient.patch<AdminUser>(`/api/v2/users/${id}`, input).then((r) => r.data),
    onSuccess: async (data, variables, result, context) => {
      const state = useAuthStore.getState()
      if (state.user?.id === data.id && state.accessToken) state.setAuth(data, state.accessToken)
      await invalidateResources(
        client,
        ['admin-users', 'user', 'me', 'comments', 'activities'],
        'active',
      )
      await options.onSuccess?.(data, variables, result, context)
    },
  })
}
export type MentionCandidate = { id: string; name: string; unavailable?: boolean }
export function fetchMentionUsers(search: string, signal?: AbortSignal) {
  return apiClient
    .get<{ users: MentionCandidate[] }>('/api/v2/users/mentions', { params: { search }, signal })
    .then((r) => r.data.users)
}
