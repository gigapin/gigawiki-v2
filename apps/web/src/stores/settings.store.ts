import axios from 'axios'
import { create } from 'zustand'

interface SettingsState {
  settings: Record<string, string>
  fetchSettings: () => Promise<void>
  getSetting: (key: string) => string | undefined
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  fetchSettings: async () => {
    try {
      const { data } = await axios.get<{ data: Record<string, string> }>(
        `${import.meta.env.VITE_API_URL}/api/v2/settings`,
        { withCredentials: true },
      )
      set({ settings: data.data })
    } catch {
      // silently fail — settings unavailable
    }
  },
  getSetting: (key) => get().settings[key],
}))
