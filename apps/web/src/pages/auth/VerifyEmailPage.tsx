import { Link, useLoaderData } from '@tanstack/react-router'
import { CheckCircle2, LoaderCircle, MailWarning } from 'lucide-react'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { ResendVerificationForm } from '@/components/auth/ResendVerificationForm'
import { Button } from '@/components/ui/button'

export function VerifyEmailPending() {
  return (
    <AuthLayout
      title="Verifying your email"
      description="Please wait while we confirm your email address."
    >
      <LoaderCircle
        role="status"
        aria-label="Verifying email"
        className="mx-auto size-8 animate-spin text-primary"
      />
    </AuthLayout>
  )
}

export function VerifyEmailPage() {
  const result = useLoaderData({ from: '/verify-email' })
  const success = result.status === 'success'
  return (
    <AuthLayout
      title={success ? 'Email verified' : 'Unable to verify your email'}
      description={
        success
          ? 'Your account is ready. You can now sign in to GigaWiki.'
          : 'The link may be expired, invalid or already used. Request a new link below.'
      }
    >
      <div className="space-y-5">
        {success ? (
          <CheckCircle2 className="mx-auto size-10 text-primary" aria-hidden="true" />
        ) : (
          <MailWarning className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        )}
        <p role={success ? 'status' : 'alert'} className="text-sm">
          {result.message}
        </p>
        {!success && <ResendVerificationForm />}
        <Button asChild className="w-full" variant={success ? 'default' : 'outline'}>
          <Link to="/login" search={{ redirect: '' }}>
            Continue to sign in
          </Link>
        </Button>
      </div>
    </AuthLayout>
  )
}
