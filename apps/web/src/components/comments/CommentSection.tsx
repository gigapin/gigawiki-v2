import { useState } from 'react'

import { CommentForm } from './CommentForm'
import { CommentList } from './CommentList'

import { useComments, useCommentMutation } from '@/api/comments'
import type { CommentAction, CommentResource } from '@/api/comments'
import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { Pagination } from '@/components/shared/Pagination'

export function CommentSection({ resource }: { resource: CommentResource }) {
  const [page, setPage] = useState(1)
  const query = useComments(resource, page)
  const mutation = useCommentMutation(resource)
  const user = useAuthStore((s) => s.user)
  const data = query.data
  // After deleting the final root on a page, read the preceding valid page.
  const effectivePage = data
    ? Math.min(page, Math.max(1, Math.ceil(data.total / data.limit)))
    : page
  if (!mutation.isPending && effectivePage !== page) setPage(effectivePage)
  const run = async (action: CommentAction) => {
    mutation.reset()
    await mutation.mutateAsync(action)
  }
  return (
    <section aria-label="Comments" className="space-y-4 border-t pt-6">
      <h2 className="text-xl font-semibold">Comments {data && `(${data.total} threads)`}</h2>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        data && (
          <>
            {data.comments.length === 0 ? (
              <EmptyState title="No comments yet" description="Start the discussion." />
            ) : (
              <CommentList
                comments={data.comments}
                pending={mutation.isPending}
                run={run}
                error={mutation.isError ? apiErrorMessage(mutation.error) : undefined}
              />
            )}
            <Pagination
              page={page}
              total={data.total}
              limit={data.limit}
              disabled={mutation.isPending}
              onChange={setPage}
            />
            {user && (
              <CommentForm
                pending={mutation.isPending}
                onSubmit={async (body) => {
                  await run({ type: 'create', body })
                  // The API sorts roots oldest first, so a new thread is on the final page.
                  const latest = await query.refetch()
                  if (latest.data)
                    setPage(Math.max(1, Math.ceil(latest.data.total / latest.data.limit)))
                }}
              />
            )}
          </>
        )
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(mutation.error)}
        </p>
      )}
    </section>
  )
}
