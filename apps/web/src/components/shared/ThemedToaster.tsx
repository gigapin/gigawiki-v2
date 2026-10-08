import { Toaster } from 'sonner'

import { useThemeStore } from '@/stores/theme.store'

export function ThemedToaster() {
  const theme = useThemeStore((state) => state.theme)
  return <Toaster theme={theme} richColors />
}
