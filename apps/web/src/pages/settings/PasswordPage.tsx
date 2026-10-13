import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'

import { useChangePassword } from '@/api/users'
import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function PasswordPage() {
  const [currentPassword, setCurrent] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const mutation = useChangePassword()
  const navigate = useNavigate()
  const client = useQueryClient()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Changing your password signs you out on all devices.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            if (!currentPassword) return setError('Enter your current password.')
            if (newPassword.length < 8 || newPassword.length > 128)
              return setError('Use a password of 8–128 characters.')
            if (newPassword !== confirm) return setError('Passwords do not match.')
            if (mutation.isPending) return
            try {
              await mutation.mutateAsync({ currentPassword, newPassword })
              setCurrent('')
              setNew('')
              setConfirm('')
              useAuthStore.getState().clearAuth()
              await client.cancelQueries()
              client.clear()
              await navigate({ to: '/login', search: { redirect: '', passwordChanged: true } })
            } catch (cause) {
              setError(apiErrorMessage(cause))
            }
          }}
        >
          <fieldset disabled={mutation.isPending} className="space-y-4">
            {[
              {
                id: 'current-password',
                label: 'Current password',
                value: currentPassword,
                set: setCurrent,
                auto: 'current-password',
              },
              {
                id: 'new-password',
                label: 'New password',
                value: newPassword,
                set: setNew,
                auto: 'new-password',
              },
              {
                id: 'confirm-password',
                label: 'Confirm password',
                value: confirm,
                set: setConfirm,
                auto: 'new-password',
              },
            ].map((field) => (
              <div className="space-y-2" key={field.id}>
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  type={visible ? 'text' : 'password'}
                  autoComplete={field.auto}
                  maxLength={128}
                />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setVisible(!visible)}>
              {visible ? <EyeOff /> : <Eye />}
              {visible ? 'Hide passwords' : 'Show passwords'}
            </Button>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
