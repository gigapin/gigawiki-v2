import axios from 'axios'
import { create } from 'zustand'

import { API_BASE_URL } from '@/api/config'

interface SettingsState {
  settings: Record<string, string>
  fetchSettings: () => Promise<void>
  getSetting: (key: string) => string | undefined
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  fetchSettings: async () => {
    try {
      const { data } = await axios.get<Record<string, string>>(`${API_BASE_URL}/api/v2/settings`, {
        withCredentials: true,
      })
      set({ settings: data })
    } catch {
      // silently fail — settings unavailable
    }
  },
  getSetting: (key) => get().settings[key],
}))
