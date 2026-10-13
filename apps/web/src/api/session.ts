import axios from 'axios'
import type { User } from '@shared/types/user'

import { API_BASE_URL } from './config'

export function refreshAccessToken() {
  return axios
    .post<{
      accessToken: string
    }>(`${API_BASE_URL}/api/v2/auth/refresh`, {}, { withCredentials: true })
    .then((r) => r.data.accessToken)
}
export function fetchSessionUser(accessToken: string, signal?: AbortSignal) {
  return axios
    .get<{ user: User }>(`${API_BASE_URL}/api/v2/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      withCredentials: true,
      ...(signal ? { signal } : {}),
    })
    .then((r) => r.data.user)
}
