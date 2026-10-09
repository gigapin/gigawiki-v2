import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ForgotPasswordSchema } from '@shared/schemas/auth.schema'

import { useForgotPassword } from '@/api/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/api-error'

export function ForgotPasswordPage() {
  const mutation = useForgotPassword()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  return (
    <AuthLayout
      title={mutation.isSuccess ? 'Check your inbox' : 'Forgot your password?'}
      description={
        mutation.isSuccess
          ? 'If that email is registered, a reset link has been sent.'
          : 'Enter your email to request a password reset link.'
      }
    >
      <div className="space-y-4">
        {mutation.isSuccess ? (
          <p role="status" className="text-sm text-muted-foreground">
            Check your spam folder too. The reset link expires in one hour.
          </p>
        ) : (
          <form
            noValidate
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              const result = ForgotPasswordSchema.safeParse({ email: email.trim() })
              setError(result.success ? '' : 'Enter a valid email address.')
              if (result.success && !mutation.isPending) mutation.mutate(email)
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                disabled={mutation.isPending}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'forgot-email-error' : undefined}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
              />
              {error && (
                <p id="forgot-email-error" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            {mutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(mutation.error)}
              </p>
            )}
            <Button className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
        <Button asChild variant="ghost" className="w-full">
          <Link to="/login" search={{ redirect: '' }}>
            Back to sign in
          </Link>
        </Button>
      </div>
    </AuthLayout>
  )
}
