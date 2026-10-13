import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'

import { useSettingsStore } from '@/stores/settings.store'

export function AppInit() {
  const siteName = useSettingsStore((s) => s.settings.SITE_NAME?.trim() || 'GiGaWiki')
  useEffect(() => {
    document.title = siteName
  }, [siteName])
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return <Outlet />
}
