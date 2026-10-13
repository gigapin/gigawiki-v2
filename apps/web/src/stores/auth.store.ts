import { create } from 'zustand'
import type { User } from '@shared/types/user'

import { refreshAccessToken, fetchSessionUser } from '@/api/session'

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
      const accessToken = await refreshAccessToken()
      const user = await fetchSessionUser(accessToken)
      set({ user, accessToken, isLoading: false, isInitialized: true })
    } catch {
      set({ user: null, accessToken: null, isLoading: false, isInitialized: true })
    }
  },
}))
