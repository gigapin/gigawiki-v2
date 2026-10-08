import axios from 'axios'
import { create } from 'zustand'
import type { User } from '@shared/types/user'

import { API_BASE_URL } from '@/api/config'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isInitialized: boolean
  setAuth: (user: User, accessToken: string) => void
  clearAuth: () => void
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  initAuth: async () => {
    if (get().isInitialized) return
    set({ isLoading: true })
    try {
      const { data: refreshData } = await axios.post<{ accessToken: string }>(
        `${API_BASE_URL}/api/v2/auth/refresh`,
        {},
        { withCredentials: true },
      )
      const accessToken = refreshData.accessToken
      const { data: meData } = await axios.get<{ user: User }>(`${API_BASE_URL}/api/v2/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
      })
      set({ user: meData.user, accessToken, isLoading: false, isInitialized: true })
    } catch {
      set({ user: null, accessToken: null, isLoading: false, isInitialized: true })
    }
  },
}))
