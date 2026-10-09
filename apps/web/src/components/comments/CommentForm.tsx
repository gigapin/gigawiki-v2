import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function CommentForm({
  initialBody = '',
  label = 'New comment',
  submitLabel = 'Post comment',
  pending,
  onSubmit,
  onCancel,
}: {
  initialBody?: string
  label?: string
  submitLabel?: string
  pending: boolean
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
}) {
  const [body, setBody] = useState(initialBody)
  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!body.trim() || pending) return
        try {
          await onSubmit(body.trim())
          setBody('')
        } catch {
          /* Parent displays the mutation error; retain the draft. */
        }
      }}
    >
      <label className="block space-y-2 text-sm">
        <span>{label}</span>
        <Textarea
          value={body}
          disabled={pending}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
        />
      </label>
      <p className="text-xs text-muted-foreground">Use **bold**, *italic* or `code`.</p>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !body.trim()}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
