import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import type { InviteDto } from '@shared/schemas/auth.schema'

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
    onSettled: () => client.invalidateQueries({ queryKey: ['admin-invites'] }),
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
export function useUsers(page: number, search: string) {
  return useQuery({
    enabled: useAuthStore((s) => s.user?.role === 'ADMIN'),
    queryKey: ['admin-users', page, search],
    queryFn: () =>
      apiClient
        .get<UserList>('/api/v2/users', { params: { page, limit: 20, search } })
        .then((r) => r.data),
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
      void client.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}
export function useDeletionPreview(id: string | null) {
  return useQuery({
    queryKey: ['user-deletion-preview', id],
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: () =>
      apiClient.get<DeletionPreview>(`/api/v2/users/${id}/deletion-preview`).then((r) => r.data),
  })
}
export function useDeleteUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fingerprint }: { id: string; fingerprint: string }) =>
      apiClient.delete(`/api/v2/users/${id}`, { data: { fingerprint } }),
    onSuccess: () => client.invalidateQueries(),
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
    queryKey: ['admin-invites', page],
    queryFn: () =>
      apiClient
        .get<{
          invites: InviteItem[]
          total: number
          limit: number
        }>('/api/v2/users/invites', { params: { page, limit: 20 } })
        .then((r) => r.data),
  })
}
export function useResendInvite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ message: string }>(`/api/v2/users/invites/${id}/resend`).then((r) => r.data),
    onSettled: () => client.invalidateQueries({ queryKey: ['admin-invites'] }),
  })
}
export function useCancelInvite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v2/users/invites/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-invites'] }),
  })
}
