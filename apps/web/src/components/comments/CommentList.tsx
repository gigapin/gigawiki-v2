import { CommentItem } from './CommentItem'

import type { CommentAction, CommentItemData } from '@/api/comments'
export function CommentList({
  comments,
  pending,
  run,
  error,
}: {
  comments: CommentItemData[]
  pending: boolean
  run: (action: CommentAction) => Promise<void>
  error?: string
}) {
  return (
    <div className="space-y-4">
      {comments
        .filter((comment) => !comment.parentId)
        .map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            pending={pending}
            run={run}
            error={error}
          />
        ))}
    </div>
  )
}
