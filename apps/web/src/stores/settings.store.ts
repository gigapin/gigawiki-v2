import { create } from 'zustand'

import { fetchPublicSettings } from '@/api/public-settings'

interface SettingsState {
  settings: Record<string, string>
  fetchSettings: () => Promise<void>
  getSetting: (key: string) => string | undefined
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  fetchSettings: async () => {
    try {
      const data = await fetchPublicSettings()
      set({ settings: data })
    } catch {
      // silently fail — settings unavailable
    }
  },
  getSetting: (key) => get().settings[key],
}))
