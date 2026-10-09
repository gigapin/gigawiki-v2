import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AccountPasswordForm({
  invite = false,
  pending,
  error,
  onSubmit,
}: {
  invite?: boolean
  pending: boolean
  error?: string
  onSubmit: (values: { name: string; password: string }) => void
}) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        const next: Record<string, string> = {}
        if (invite && (!name.trim() || name.trim().length > 100))
          next.name = 'Enter a name of 1–100 characters.'
        if (password.length < 8 || password.length > 128)
          next.password = 'Use a password of 8–128 characters.'
        if (confirm !== password) next.confirm = 'Passwords do not match.'
        setErrors(next)
        if (!Object.keys(next).length && !pending) onSubmit({ name: name.trim(), password })
      }}
    >
      <fieldset disabled={pending} className="space-y-4">
        {invite && (
          <div className="space-y-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              autoComplete="name"
              value={name}
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'account-name-error' : undefined}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((current) => ({ ...current, name: '' }))
              }}
            />
            {errors.name && (
              <p id="account-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="account-password">New password</Label>
          <div className="relative">
            <Input
              id="account-password"
              className="pr-11"
              type={visible ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              maxLength={128}
              aria-invalid={Boolean(errors.password)}
              aria-describedby="account-password-help"
              onChange={(event) => {
                setPassword(event.target.value)
                setErrors((current) => ({ ...current, password: '' }))
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              aria-label={visible ? 'Hide password' : 'Show password'}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <p
            id="account-password-help"
            className={
              errors.password ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'
            }
          >
            {errors.password || 'Use at least 8 characters.'}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-confirm">Confirm password</Label>
          <Input
            id="account-confirm"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            maxLength={128}
            aria-invalid={Boolean(errors.confirm)}
            aria-describedby={errors.confirm ? 'account-confirm-error' : undefined}
            onChange={(event) => {
              setConfirm(event.target.value)
              setErrors((current) => ({ ...current, confirm: '' }))
            }}
          />
          {errors.confirm && (
            <p id="account-confirm-error" className="text-sm text-destructive">
              {errors.confirm}
            </p>
          )}
        </div>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : invite ? 'Accept invitation' : 'Reset password'}
      </Button>
    </form>
  )
}
