import { create } from 'zustand'

// Deliberately memory-only: never put this challenge in a URL or persistent storage.
export const useInitialPasswordStore = create<{
  token: string | null
  set: (token: string) => void
  clear: () => void
}>((set) => ({ token: null, set: (token) => set({ token }), clear: () => set({ token: null }) }))
