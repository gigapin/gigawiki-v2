import { useState } from 'react'

import { CommentForm } from './CommentForm'

import type { CommentAction, CommentItemData } from '@/api/comments'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

function CommentBody({ body }: { body: string }) {
  // Render React text nodes only; HTML and arbitrary URLs remain literal text.
  return (
    <p className="whitespace-pre-wrap break-words text-sm">
      {body
        .split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g)
        .map((part, index) =>
          part.startsWith('**') ? (
            <strong key={index}>{part.slice(2, -2)}</strong>
          ) : part.startsWith('*') ? (
            <em key={index}>{part.slice(1, -1)}</em>
          ) : part.startsWith('`') ? (
            <code key={index}>{part.slice(1, -1)}</code>
          ) : (
            part
          ),
        )}
    </p>
  )
}
export function CommentItem({
  comment,
  pending,
  run,
  isReply = false,
  error,
}: {
  comment: CommentItemData
  pending: boolean
  run: (action: CommentAction) => Promise<void>
  isReply?: boolean
  error?: string
}) {
  const user = useAuthStore((s) => s.user)
  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const replies = comment.replies ?? []
  const own = Boolean(user && user.id === comment.userId)
  return (
    <article
      aria-label={`Comment by ${comment.user.name}`}
      className="space-y-3 rounded-lg border p-4"
    >
      <header className="flex items-center gap-3">
        <Avatar className="size-8">
          <AvatarImage src={comment.user.avatar?.url} alt="" />
          <AvatarFallback>{comment.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <span className="font-medium">{comment.user.name}</span> ·{' '}
          <time dateTime={comment.createdAt}>
            {new Date(comment.createdAt).toLocaleString('en-GB')}
          </time>
          {comment.updatedAt !== comment.createdAt && (
            <span className="text-muted-foreground"> (edited)</span>
          )}
        </div>
      </header>
      {editing ? (
        <CommentForm
          initialBody={comment.body}
          label="Edit comment"
          submitLabel="Save comment"
          pending={pending}
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            await run({ type: 'update', id: comment.id, body })
            setEditing(false)
          }}
        />
      ) : (
        <CommentBody body={comment.body} />
      )}
      <div className="flex flex-wrap gap-2">
        {user && !isReply && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setReplying(!replying)}
          >
            Reply
          </Button>
        )}
        {own && !editing && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
        {(own || user?.role === 'ADMIN') && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDeleting(true)}>
            Delete
          </Button>
        )}
        {!isReply && replies.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'Show'} replies ({replies.length})
          </Button>
        )}
      </div>
      {replying && (
        <CommentForm
          label={`Reply to ${comment.user.name}`}
          submitLabel="Post reply"
          pending={pending}
          onCancel={() => setReplying(false)}
          onSubmit={async (body) => {
            await run({ type: 'create', parentId: comment.id, body })
            setReplying(false)
            setExpanded(true)
          }}
        />
      )}
      {expanded && (
        <div className="space-y-3 border-l pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              pending={pending}
              run={run}
              isReply
              error={error}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this comment?"
        description={
          isReply
            ? 'This reply will be permanently deleted.'
            : 'This comment and all its replies will be permanently deleted.'
        }
        pending={pending}
        error={error}
        onConfirm={() => {
          if (!pending) void run({ type: 'delete', id: comment.id }).catch(() => {})
        }}
      />
    </article>
  )
}
