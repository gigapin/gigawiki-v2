import { useSettingsStore } from '@/stores/settings.store'
export function SiteLogo() {
  const logo = useSettingsStore((state) => state.settings.SITE_LOGO_URL)
  const name = useSettingsStore((state) => state.settings.SITE_NAME || 'GiGaWiki')
  return logo ? (
    <img src={logo} alt={name} className="size-full object-contain" />
  ) : (
    <>{name.charAt(0)}</>
  )
}
