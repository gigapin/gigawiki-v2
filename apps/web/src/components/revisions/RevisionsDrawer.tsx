import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import type { PageDetail } from '@/api/pages'
import { useRevision, useRevisions, useRestoreRevision } from '@/api/revisions'
import { PageContent } from '@/components/pages/PageContent'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'

const LIMIT = 10

export function RevisionsDrawer({ page, onClose }: { page: PageDetail; onClose: () => void }) {
  const user = useAuthStore((state) => state.user)
  if (user?.role !== 'EDITOR' && user?.role !== 'ADMIN') return null
  return <RevisionsDrawerContent page={page} onClose={onClose} />
}

function RevisionsDrawerContent({ page, onClose }: { page: PageDetail; onClose: () => void }) {
  const [pagination, setPagination] = useState(1)
  const [selected, setSelected] = useState<number | 'current'>('current')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const list = useRevisions(page.slug, pagination, LIMIT)
  const detail = useRevision(page.slug, selected === 'current' ? undefined : selected)
  const restoration = useRestoreRevision(page.slug)
  const user = useAuthStore((state) => state.user)
  const canRestore = user?.role === 'EDITOR' || user?.role === 'ADMIN'
  const navigate = useNavigate()
  const client = useQueryClient()
  const preview = selected === 'current' ? page : detail.data

  function select(number: number | 'current') {
    setSelected(number)
    restoration.reset()
  }

  async function restore() {
    if (selected === 'current' || restoration.isPending || !canRestore) return
    try {
      const restored = await restoration.mutateAsync(selected)
      toast.success('Revision restored')
      setConfirmOpen(false)
      onClose()
      if (restored.slug !== page.slug) {
        await navigate({ to: '/pages/$slug', params: { slug: restored.slug }, replace: true })
        client.removeQueries({ queryKey: ['page', page.slug], exact: true })
      } else {
        await client.invalidateQueries({ queryKey: ['page', page.slug], exact: true })
      }
    } catch {
      // The confirmation dialog keeps the API error visible and allows retry.
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !restoration.isPending) onClose()
      }}
    >
      <DialogContent
        className="left-auto right-0 top-0 flex h-dvh max-h-dvh w-full max-w-4xl translate-x-0 translate-y-0 flex-col rounded-none p-0 sm:rounded-none"
        onEscapeKeyDown={(event) => {
          if (restoration.isPending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (restoration.isPending) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b p-6 pr-12">
          <DialogTitle>Revision history</DialogTitle>
          <DialogDescription>
            {page.title} · Preview a version before restoring it.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto md:grid md:grid-cols-[260px_minmax(0,1fr)]">
          <aside
            className="space-y-3 border-b p-4 md:border-b-0 md:border-r"
            aria-label="Revision list"
          >
            <Button
              variant={selected === 'current' ? 'secondary' : 'outline'}
              className="h-auto w-full justify-start whitespace-normal text-left"
              aria-pressed={selected === 'current'}
              disabled={restoration.isPending}
              onClick={() => select('current')}
            >
              Revision {page.currentRevision} <Badge variant="outline">Current</Badge>
            </Button>
            {list.isPending ? (
              <ListSkeleton />
            ) : list.isError ? (
              <ErrorState
                description={apiErrorMessage(list.error)}
                onRetry={() => void list.refetch()}
              />
            ) : list.data.revisions.length === 0 ? (
              <EmptyState
                title="No previous revisions yet"
                description="Editing the title or content creates a snapshot of the previous version."
              />
            ) : (
              <>
                {list.data.revisions.map((revision) => (
                  <button
                    key={revision.id}
                    type="button"
                    aria-pressed={selected === revision.revisionNumber}
                    disabled={restoration.isPending}
                    onClick={() => select(revision.revisionNumber)}
                    className="w-full rounded-md border p-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    style={
                      selected === revision.revisionNumber
                        ? { background: 'oklch(var(--secondary))' }
                        : undefined
                    }
                  >
                    <span className="block font-medium">
                      Revision {revision.revisionNumber} · {revision.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {revision.createdBy.name} ·{' '}
                      {new Date(revision.createdAt).toLocaleString('en-GB')}
                    </span>
                    {revision.summary && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {revision.summary}
                      </span>
                    )}
                  </button>
                ))}
                <Pagination
                  page={pagination}
                  total={list.data.total}
                  limit={LIMIT}
                  onChange={setPagination}
                  disabled={restoration.isPending || list.isFetching}
                />
              </>
            )}
          </aside>
          <section className="min-w-0 space-y-4 p-5" aria-label="Revision preview">
            {selected !== 'current' && detail.isPending ? (
              <ListSkeleton />
            ) : selected !== 'current' && detail.isError ? (
              <ErrorState
                description={apiErrorMessage(detail.error)}
                onRetry={() => void detail.refetch()}
              />
            ) : preview ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {selected === 'current' ? 'Current version' : `Revision ${selected}`}
                    </p>
                    <h2 className="break-words text-xl font-semibold">{preview.title}</h2>
                  </div>
                  {selected !== 'current' && canRestore && (
                    <Button
                      disabled={restoration.isPending}
                      onClick={() => {
                        restoration.reset()
                        setConfirmOpen(true)
                      }}
                    >
                      <RotateCcw /> Restore this revision
                    </Button>
                  )}
                </div>
                <PageContent key={`${page.id}:${selected}`} content={preview.content} />
              </>
            ) : null}
          </section>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Restore revision ${selected}?`}
          description="The title and content will be replaced. The current version will be saved in history so you can restore it later. Publication and visibility settings stay unchanged."
          pending={restoration.isPending}
          error={restoration.isError ? apiErrorMessage(restoration.error) : undefined}
          onConfirm={() => void restore()}
          confirmLabel="Restore revision"
          pendingLabel="Restoring…"
          confirmVariant="default"
        />
      </DialogContent>
    </Dialog>
  )
}
