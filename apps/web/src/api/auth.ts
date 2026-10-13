import type { User } from '@shared/types/user'
import { useMutation, useQuery } from '@tanstack/react-query'

import { fetchSessionUser } from './session'
import { queryKeys } from './query-keys'
import type { MutationOptions } from './hook-options'
import { publicSettingsOptions } from './settings'
import apiClient from './client'

import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'

export type RegisterInput = { name: string; email: string; password: string }
export type AuthMessage = { message: string }

export function registerAccount(input: RegisterInput) {
  return apiClient
    .post<AuthMessage>('/api/v2/auth/register', input)
    .then((response) => response.data)
}
export function resendVerificationEmail(email: string) {
  return apiClient
    .post<AuthMessage>('/api/v2/auth/resend-verification', { email })
    .then((response) => response.data)
}
export function useRegistrationSettings() {
  return useQuery(publicSettingsOptions())
}
export function useRegister() {
  return useMutation({ mutationFn: registerAccount })
}
export function useResendVerification() {
  return useMutation({ mutationFn: resendVerificationEmail })
}

export type VerificationResult = { status: 'success' | 'error'; message: string }
export async function verifyEmailToken(token: string): Promise<VerificationResult> {
  if (!token) return { status: 'error', message: 'This verification link is missing a token.' }
  try {
    const { data } = await apiClient.post<AuthMessage>('/api/v2/auth/verify-email', { token })
    return { status: 'success', message: data.message }
  } catch (error) {
    return { status: 'error', message: apiErrorMessage(error) }
  }
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient
        .post<AuthMessage>('/api/v2/auth/forgot-password', { email: email.trim().toLowerCase() })
        .then((r) => r.data),
  })
}
export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; newPassword: string }) =>
      apiClient.post<AuthMessage>('/api/v2/auth/reset-password', input).then((r) => r.data),
  })
}
export function useAcceptInvite() {
  return useMutation({
    mutationFn: (input: { token: string; name: string; password: string }) =>
      apiClient
        .post<{ accessToken: string }>('/api/v2/auth/accept-invite', input)
        .then((r) => r.data),
  })
}

// Read the invited account with its new token, even if another account is signed in.
export function useInvitationSession() {
  return useMutation({
    mutationFn: (accessToken: string) =>
      fetchSessionUser(accessToken).then((user) => ({ user, accessToken })),
  })
}

export type LoginInput = { email: string; password: string }
export type AuthSession = { user: User; accessToken: string }
export function useMe() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: queryKeys.me(userId),
    enabled: Boolean(userId),
    queryFn: ({ signal }) =>
      apiClient.get<{ user: User }>('/api/v2/auth/me', { signal }).then((r) => r.data.user),
  })
}
export function useLogin(options: MutationOptions<AuthSession, LoginInput> = {}) {
  return useMutation({
    ...options,
    mutationFn: async (input: LoginInput) => {
      const previousAccount = useAuthStore.getState().user?.id
      const { data } = await apiClient.post<{ accessToken: string }>('/api/v2/auth/login', {
        ...input,
        email: input.email.trim().toLowerCase(),
      })
      const {
        data: { user },
      } = await apiClient.get<{ user: User }>('/api/v2/auth/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      })
      if (useAuthStore.getState().user?.id !== previousAccount)
        throw new Error('Session changed during login')
      return { user, accessToken: data.accessToken }
    },
    onSuccess: async (session, variables, result, context) => {
      useAuthStore.getState().setAuth(session.user, session.accessToken)
      await options.onSuccess?.(session, variables, result, context)
    },
  })
}
export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const accountId = useAuthStore.getState().user?.id
      try {
        await apiClient.post('/api/v2/auth/logout')
      } finally {
        if (useAuthStore.getState().user?.id === accountId) useAuthStore.getState().clearAuth()
      }
    },
  })
}
