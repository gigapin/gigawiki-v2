import { useThemeStore } from '@/stores/theme.store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
export function AppearancePage() {
  const { theme, setTheme } = useThemeStore()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Your theme is saved in this browser.</CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset className="flex gap-6">
          <legend className="mb-3 text-sm font-medium">Theme</legend>
          {(['light', 'dark'] as const).map((value) => (
            <label className="flex cursor-pointer items-center gap-2" key={value}>
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => setTheme(value)}
              />
              {value === 'light' ? 'Light' : 'Dark'}
            </label>
          ))}
        </fieldset>
      </CardContent>
    </Card>
  )
}
