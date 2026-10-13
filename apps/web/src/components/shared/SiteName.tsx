import { useSettingsStore } from '@/stores/settings.store'
export function SiteName() {
  return <>{useSettingsStore((s) => s.settings.SITE_NAME?.trim() || 'GiGaWiki')}</>
}
