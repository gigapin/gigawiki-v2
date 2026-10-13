import { useState } from 'react'

import { useInvites, useResendInvite, useCancelInvite, type InviteItem } from '@/api/users'
import { apiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorState, EmptyState, ListSkeleton } from '@/components/shared/ResourceState'

export function InviteList() {
  const [page, setPage] = useState(1)
  const [canceling, setCanceling] = useState<InviteItem | null>(null)
  const query = useInvites(page)
  const resend = useResendInvite()
  const cancel = useCancelInvite()
  return (
    <section className="space-y-4" aria-label="Pending invitations">
      <h2 className="text-xl font-semibold">Pending invitations</h2>
      {resend.isError && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(resend.error)}
        </p>
      )}
      {resend.isSuccess && (
        <p role="status" className="text-sm">
          {resend.data.message}
        </p>
      )}
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <>
          {!query.data.invites.length ? (
            <EmptyState
              title="No pending invitations"
              action={
                page > 1 ? (
                  <Button onClick={() => setPage(page - 1)}>Previous page</Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y rounded-md border">
              {query.data.invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="break-all font-medium">{invite.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {invite.role} ·{' '}
                      {new Date(invite.expiresAt) <= new Date() ? 'Expired' : 'Pending'} ·{' '}
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={resend.isPending || cancel.isPending}
                      onClick={() => resend.mutate(invite.id)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      disabled={resend.isPending || cancel.isPending}
                      onClick={() => {
                        cancel.reset()
                        setCanceling(invite)
                      }}
                    >
                      Cancel invitation
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            total={query.data.total}
            limit={20}
            onChange={setPage}
            disabled={query.isFetching}
          />
        </>
      )}
      <ConfirmDialog
        open={Boolean(canceling)}
        onOpenChange={(open) => {
          if (!open) setCanceling(null)
        }}
        title="Cancel invitation?"
        description={`The invitation for ${canceling?.email ?? ''} will stop working.`}
        pending={cancel.isPending}
        error={cancel.isError ? apiErrorMessage(cancel.error) : undefined}
        confirmLabel="Cancel invitation"
        onConfirm={() => {
          if (canceling)
            cancel.mutate(canceling.id, {
              onSuccess: () => {
                setCanceling(null)
                if (query.data?.invites.length === 1 && page > 1) setPage(page - 1)
              },
            })
        }}
      />
    </section>
  )
}
