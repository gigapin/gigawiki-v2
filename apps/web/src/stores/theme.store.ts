import { create } from 'zustand'

export type Theme = 'light' | 'dark'

export const useThemeStore = create<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>((set) => ({
  theme:
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
      ? 'light'
      : 'dark',
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem('gigawiki-theme', theme)
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
    set({ theme })
  },
}))
