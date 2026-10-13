import { useState } from 'react'

import { useSettings, useUpdateSetting, type EditableSettingKey } from '@/api/settings'
import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ErrorState, ListSkeleton } from '@/components/shared/ResourceState'

function SettingField({
  settingKey,
  label,
  initial,
}: {
  settingKey: EditableSettingKey
  label: string
  initial: string
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')
  const mutation = useUpdateSetting()
  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={(e) => {
        e.preventDefault()
        setError('')
        if (settingKey === 'SITE_NAME' && (!value.trim() || value.trim().length > 100))
          return setError('Enter a site name of 1–100 characters.')
        if (!mutation.isPending)
          mutation.mutate({
            key: settingKey,
            value: settingKey === 'SITE_NAME' ? value.trim() : value,
          })
      }}
    >
      <Label htmlFor={settingKey}>{label}</Label>
      {settingKey === 'ALLOW_SELF_REGISTRATION' ? (
        <div>
          <Switch
            id={settingKey}
            checked={value === 'true'}
            disabled={mutation.isPending}
            onCheckedChange={(checked) => {
              setValue(String(checked))
              mutation.reset()
            }}
          />
        </div>
      ) : settingKey === 'DEFAULT_USER_ROLE' ? (
        <select
          id={settingKey}
          className="w-full rounded-md border bg-background p-2"
          disabled={mutation.isPending}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            mutation.reset()
          }}
        >
          <option value="GUEST">Guest</option>
          <option value="EDITOR">Editor</option>
        </select>
      ) : (
        <Input
          id={settingKey}
          maxLength={100}
          disabled={mutation.isPending}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            mutation.reset()
          }}
        />
      )}
      {(error || mutation.isError) && (
        <p role="alert" className="text-sm text-destructive">
          {error || apiErrorMessage(mutation.error)}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="text-sm">
          Saved.
        </p>
      )}
      <Button disabled={mutation.isPending} type="submit">
        {mutation.isPending ? 'Saving…' : `Save ${label.toLowerCase()}`}
      </Button>
    </form>
  )
}
export function AppSettingsPage() {
  const query = useSettings()
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN')
  if (!isAdmin) return <p role="alert">Admin access required.</p>
  if (query.isPending) return <ListSkeleton />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />
  return (
    <Card>
      <CardHeader>
        <CardTitle>App Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingField
          settingKey="ALLOW_SELF_REGISTRATION"
          label="Self registration"
          initial={query.data.ALLOW_SELF_REGISTRATION ?? 'true'}
        />
        <SettingField
          settingKey="DEFAULT_USER_ROLE"
          label="Default user role"
          initial={query.data.DEFAULT_USER_ROLE ?? 'GUEST'}
        />
        <SettingField
          settingKey="SITE_NAME"
          label="Site name"
          initial={query.data.SITE_NAME ?? 'GiGaWiki'}
        />
      </CardContent>
    </Card>
  )
}
