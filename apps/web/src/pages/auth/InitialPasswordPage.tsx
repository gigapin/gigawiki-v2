import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { useCompleteInitialPassword } from '@/api/parity'
import { useInitialPasswordStore } from '@/stores/initial-password.store'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-error'

export function InitialPasswordPage() {
  const token = useInitialPasswordStore((state) => state.token)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const mutation = useCompleteInitialPassword()
  const navigate = useNavigate()
  return (
    <AuthLayout
      title="Choose your password"
      description="Replace your temporary password before accessing the wiki."
    >
      {!token ? (
        <p>
          Your challenge is unavailable or expired.{' '}
          <Link to="/login" search={{ redirect: '' }}>
            Sign in again
          </Link>
          .
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setError('')
            if (password.length < 8 || password.length > 128 || password !== confirm) {
              setError('Use matching passwords of 8–128 characters.')
              return
            }
            try {
              await mutation.mutateAsync({ passwordChangeToken: token, newPassword: password })
              useInitialPasswordStore.getState().clear()
              await navigate({ to: '/login', search: { redirect: '', passwordChanged: true } })
            } catch (cause) {
              setError(apiErrorMessage(cause))
            }
          }}
        >
          <label>
            New password
            <Input
              aria-label="New password"
              autoComplete="new-password"
              type="password"
              value={password}
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Confirm password
            <Input
              aria-label="Confirm password"
              autoComplete="new-password"
              type="password"
              value={confirm}
              maxLength={128}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <Button disabled={mutation.isPending}>Change password</Button>
          <Link
            to="/login"
            search={{ redirect: '' }}
            onClick={() => useInitialPasswordStore.getState().clear()}
          >
            Cancel
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
