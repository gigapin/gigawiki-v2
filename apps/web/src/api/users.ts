import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import type { InviteDto } from '@shared/schemas/auth.schema'

import apiClient from './client'

export function useInviteUser() {
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
  })
}
export function invitationSavedWithoutEmail(error: unknown) {
  return (
    isAxiosError<{ code?: string }>(error) &&
    error.response?.data?.code === 'INVITE_DELIVERY_FAILED'
  )
}
