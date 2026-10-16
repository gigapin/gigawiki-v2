import { useState } from 'react'

import { useParityAction, useParityRead, type PageResult } from '@/api/parity'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { apiErrorMessage } from '@/lib/api-error'

type DeletedPage = {
  id: string
  title: string
  deletedAt: string
  section: {
    title: string
    deletedAt: string | null
    project: { name: string; deletedAt: string | null; subject: { deletedAt: string | null } }
  }
}
export function RecycleBinPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<DeletedPage | null>(null)
  const query = useParityRead<PageResult<DeletedPage, 'pages'>>('trash', '/admin/trash/pages', {
    page,
    limit: 20,
  })
  const restore = useParityAction(`/admin/trash/pages/${selected?.id}/restore`)
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Recycle bin</h2>
      <p>
        Deleted pages can be restored when their ancestors are active. Files and history are
        preserved.
      </p>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          onRetry={() => void query.refetch()}
          description={apiErrorMessage(query.error)}
        />
      ) : (
        <>
          {query.data.pages.length === 0 && <p>No deleted pages.</p>}
          {query.data.pages.map((item) => (
            <article key={item.id} className="flex justify-between rounded border p-3">
              <div>
                <strong>{item.title}</strong>
                <p>
                  {item.section.project.name} / {item.section.title}
                </p>
                <time>{new Date(item.deletedAt).toLocaleString()}</time>
              </div>
              <Button
                onClick={() => {
                  restore.reset()
                  setSelected(item)
                }}
              >
                Restore
              </Button>
            </article>
          ))}
          <Pagination page={page} limit={20} total={query.data.total} onChange={setPage} />
        </>
      )}
      <ConfirmDialog
        confirmLabel="Restore"
        pendingLabel="Restoring…"
        confirmVariant="default"
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        title="Restore this page?"
        description={selected?.title ?? ''}
        pending={restore.isPending}
        error={restore.isError ? apiErrorMessage(restore.error) : undefined}
        onConfirm={() => restore.mutate({}, { onSuccess: () => setSelected(null) })}
      />
    </section>
  )
}
