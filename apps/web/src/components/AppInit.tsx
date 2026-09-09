import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'

import { useSettingsStore } from '@/stores/settings.store'

export function AppInit() {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return <Outlet />
}
