import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

import { useRegister, useRegistrationSettings } from '@/api/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { ResendVerificationForm } from '@/components/auth/ResendVerificationForm'
import { ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/api-error'
import {
  accountCreatedWithoutEmail,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationValues,
} from '@/lib/registration'

export function RegisterPage() {
  const settings = useRegistrationSettings()
  const mutation = useRegister()
  const [values, setValues] = useState<RegistrationValues>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const createdWithoutEmail = accountCreatedWithoutEmail(mutation.error)
  const created = mutation.isSuccess || createdWithoutEmail
  function change(field: keyof RegistrationValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  if (created)
    return (
      <AuthLayout
        title="Check your inbox"
        description="Your account has been created. Confirm your email to sign in."
      >
        <div className="space-y-5">
          <CheckCircle2 className="mx-auto size-10 text-primary" aria-hidden="true" />
          <p role="status" className="text-sm leading-relaxed">
            {createdWithoutEmail ? (
              'We could not queue the verification email. Use the form below to request a new link.'
            ) : (
              <>
                Open the verification email sent to{' '}
                <strong className="break-all">{values.email.trim()}</strong>. The link expires in 24
                hours.
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            If you do not see the message, check your spam folder or request a new email below.
          </p>
          <ResendVerificationForm initialEmail={values.email.trim()} />
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login" search={{ redirect: '' }}>
              Back to sign in
            </Link>
          </Button>
        </div>
      </AuthLayout>
    )

  return (
    <AuthLayout
      title="Create an account"
      description="Join GigaWiki and explore your team's knowledge."
    >
      {settings.isPending ? (
        <ListSkeleton />
      ) : settings.isError ? (
        <ErrorState
          description={apiErrorMessage(settings.error)}
          onRetry={() => void settings.refetch()}
        />
      ) : settings.data.ALLOW_SELF_REGISTRATION === 'false' ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Registration is currently invite-only. Contact your administrator for an invitation.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login" search={{ redirect: '' }}>
              Back to sign in
            </Link>
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const nextErrors = validateRegistration(values)
            setErrors(nextErrors)
            if (Object.keys(nextErrors).length === 0 && !mutation.isPending)
              mutation.mutate({
                name: values.name.trim(),
                email: values.email.trim().toLowerCase(),
                password: values.password,
              })
          }}
        >
          <fieldset disabled={mutation.isPending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">Name</Label>
              <Input
                id="register-name"
                required
                maxLength={100}
                autoComplete="name"
                value={values.name}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'register-name-error' : undefined}
                onChange={(event) => change('name', event.target.value)}
              />
              {errors.name && (
                <p id="register-name-error" className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                required
                type="email"
                autoComplete="email"
                value={values.email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'register-email-error' : undefined}
                onChange={(event) => change('email', event.target.value)}
              />
              {errors.email && (
                <p id="register-email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <div className="relative">
                <Input
                  id="register-password"
                  required
                  minLength={8}
                  maxLength={128}
                  className="pr-11"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={values.password}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="register-password-help"
                  onChange={(event) => change('password', event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <p
                id="register-password-help"
                className={
                  errors.password ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'
                }
              >
                {errors.password ?? 'Use at least 8 characters.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-confirm">Confirm password</Label>
              <Input
                id="register-confirm"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={128}
                value={values.confirmPassword}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined}
                onChange={(event) => change('confirmPassword', event.target.value)}
              />
              {errors.confirmPassword && (
                <p id="register-confirm-error" className="text-sm text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </fieldset>
          {mutation.isError && (
            <div
              role="alert"
              className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
            >
              <p>{apiErrorMessage(mutation.error)}</p>
              <Link to="/verify-email" search={{ token: '' }} className="underline">
                Need a new verification email?
              </Link>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating account…' : 'Create account'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" search={{ redirect: '' }} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
