import { useState } from 'react'
import { Star } from 'lucide-react'

import { TagLabel } from './TagLabel'

import { useResourceMetadata } from '@/api/resource-metadata'
import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CommentResource } from '@/api/comments'

export function ResourceMetadata({
  resource,
  tags = [],
  favorited = false,
}: {
  resource: CommentResource | { type: 'subjects'; id: string; slug: string }
  tags?: { id: string; name: string; userId: string }[]
  favorited?: boolean
}) {
  const user = useAuthStore((state) => state.user)
  const [name, setName] = useState('')
  const mutation = useResourceMetadata(resource)
  return (
    <section aria-label={`${resource.type} tags and favorite`} className="space-y-3">
      {resource.type !== 'subjects' && (
        <Button
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          aria-pressed={favorited}
          onClick={() => mutation.mutate({ type: 'favorite' })}
        >
          <Star className={favorited ? 'fill-current' : ''} />
          {favorited ? 'Remove favorite' : 'Add favorite'}
        </Button>
      )}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag.id} className="rounded border px-2 py-1 text-sm">
            <TagLabel tag={tag} />
            {(tag.userId === user?.id || user?.role === 'ADMIN') && (
              <button
                aria-label={`Remove tag ${tag.name}`}
                disabled={mutation.isPending}
                className="ml-2"
                onClick={() => mutation.mutate({ type: 'remove', id: tag.id })}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {user && user.role !== 'GUEST' && tags.length < 10 && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim())
              mutation.mutate({ type: 'tag', name }, { onSuccess: () => setName('') })
          }}
        >
          <Input
            aria-label="New tag"
            maxLength={50}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={mutation.isPending}
          />
          <Button disabled={!name.trim() || mutation.isPending}>Add tag</Button>
        </form>
      )}
      {mutation.isError && <p role="alert">{apiErrorMessage(mutation.error)}</p>}
    </section>
  )
}
