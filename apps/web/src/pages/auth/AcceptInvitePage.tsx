import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

import { useAcceptInvite, useInvitationSession } from '@/api/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AccountPasswordForm } from '@/components/auth/AccountPasswordForm'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'

export function AcceptInvitePage() {
  const { token } = useSearch({ from: '/accept-invite' })
  return <AcceptInviteContent key={token} token={token} />
}
function AcceptInviteContent({ token }: { token: string }) {
  const acceptance = useAcceptInvite()
  const session = useInvitationSession()
  const navigate = useNavigate()
  const client = useQueryClient()
  const setAuth = useAuthStore((s) => s.setAuth)
  const finish = (accessToken: string) =>
    session.mutate(accessToken, {
      onSuccess: async (result) => {
        await client.cancelQueries()
        client.clear()
        setAuth(result.user, result.accessToken)
        await navigate({ to: '/' })
      },
    })
  return (
    <AuthLayout
      title={acceptance.isSuccess ? 'Invitation accepted' : 'Join GigaWiki'}
      description={
        acceptance.isSuccess
          ? 'Your account is ready.'
          : 'Choose your name and password. Your account uses the email and role assigned by your administrator.'
      }
    >
      <div className="space-y-4">
        {!token ? (
          <p role="alert" className="text-sm text-destructive">
            This invitation link is missing a token. Ask your administrator for a new invitation.
          </p>
        ) : acceptance.isSuccess ? (
          <>
            <p role="status">
              {session.isPending ? 'Signing you in…' : 'Your invitation has been accepted.'}
            </p>
            {session.isError && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(session.error)}
              </p>
            )}
            <Button
              className="w-full"
              disabled={session.isPending}
              onClick={() => finish(acceptance.data.accessToken)}
            >
              Continue to GigaWiki
            </Button>
          </>
        ) : (
          <AccountPasswordForm
            invite
            pending={acceptance.isPending}
            error={
              acceptance.isError
                ? `${apiErrorMessage(acceptance.error)} Ask your administrator for a new invitation if the link has expired or already been used.`
                : undefined
            }
            onSubmit={({ name, password }) =>
              acceptance.mutate(
                { token, name, password },
                { onSuccess: (result) => finish(result.accessToken) },
              )
            }
          />
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
