import axios from 'axios'
import { create } from 'zustand'
import type { User } from '@shared/types/user'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  setAuth: (user: User, accessToken: string) => void
  clearAuth: () => void
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  initAuth: async () => {
    set({ isLoading: true })
    try {
      const { data: refreshData } = await axios.post<{ data: { accessToken: string } }>(
        `${import.meta.env.VITE_API_URL}/api/v2/auth/refresh`,
        {},
        { withCredentials: true },
      )
      const accessToken = refreshData.data.accessToken
      const { data: meData } = await axios.get<{ data: User }>(
        `${import.meta.env.VITE_API_URL}/api/v2/auth/me`,
        { headers: { Authorization: `Bearer ${accessToken}` }, withCredentials: true },
      )
      set({ user: meData.data, accessToken, isLoading: false })
    } catch {
      set({ user: null, accessToken: null, isLoading: false })
    }
  },
}))
