import { Link, useSearch } from '@tanstack/react-router'

import { useResetPassword } from '@/api/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AccountPasswordForm } from '@/components/auth/AccountPasswordForm'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-error'

export function ResetPasswordPage() {
  const { token } = useSearch({ from: '/reset-password' })
  return <ResetPasswordContent key={token} token={token} />
}
function ResetPasswordContent({ token }: { token: string }) {
  const mutation = useResetPassword()
  return (
    <AuthLayout
      title={mutation.isSuccess ? 'Password reset' : 'Reset your password'}
      description={
        mutation.isSuccess
          ? 'Your password has been updated. Sign in with your new password.'
          : 'Choose a new password for your GigaWiki account.'
      }
    >
      <div className="space-y-4">
        {mutation.isSuccess ? (
          <p role="status">Password reset successfully.</p>
        ) : !token ? (
          <p role="alert" className="text-sm text-destructive">
            This reset link is missing a token. Request a new link.
          </p>
        ) : (
          <AccountPasswordForm
            pending={mutation.isPending}
            error={mutation.isError ? apiErrorMessage(mutation.error) : undefined}
            onSubmit={({ password }) => mutation.mutate({ token, newPassword: password })}
          />
        )}
        {!mutation.isSuccess && (
          <Button asChild variant="outline" className="w-full">
            <Link to="/forgot-password">Request a new reset link</Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="w-full">
          <Link to="/login" search={{ redirect: '' }}>
            Continue to sign in
          </Link>
        </Button>
      </div>
    </AuthLayout>
  )
}
