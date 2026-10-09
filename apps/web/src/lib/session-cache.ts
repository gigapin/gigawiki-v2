import type { QueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/stores/auth.store'

export function bindSessionCache(client: QueryClient) {
  return useAuthStore.subscribe((current, previous) => {
    if (current.user?.id === previous.user?.id && current.user?.role === previous.user?.role) return
    // Cancel pending reads before removing the previous account's data.
    void client.cancelQueries()
    client.clear()
  })
}
