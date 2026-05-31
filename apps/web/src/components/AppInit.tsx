import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth.store'
import { useSettingsStore } from '@/stores/settings.store'

export function AppInit() {
  const initAuth = useAuthStore((s) => s.initAuth)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  useEffect(() => {
    initAuth()
    fetchSettings()
  }, [initAuth, fetchSettings])

  return <Outlet />
}
