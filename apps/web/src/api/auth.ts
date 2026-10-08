import { useMutation, useQuery } from '@tanstack/react-query'

import apiClient from './client'

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
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () =>
      apiClient.get<Record<string, string>>('/api/v2/settings').then((response) => response.data),
    staleTime: 0,
  })
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
