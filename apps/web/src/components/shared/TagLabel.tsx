import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { useParityAction } from '@/api/parity'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiErrorMessage } from '@/lib/api-error'

export function TagLabel({ tag }: { tag: { id: string; name: string; userId: string } }) {
  const user = useAuthStore((state) => state.user)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tag.name)
  const mutation = useParityAction(`/tags/${tag.id}`, 'patch')
  return (
    <span className="inline-flex items-center gap-1">
      <Link to="/tags/$name" params={{ name: tag.name }}>
        {tag.name}
      </Link>
      {(user?.role === 'ADMIN' || user?.id === tag.userId) && (
        <>
          {editing ? (
            <span className="inline-flex gap-1">
              <Input
                aria-label={`Rename tag ${tag.name}`}
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                disabled={mutation.isPending || !name.trim()}
                onClick={() => mutation.mutate({ name }, { onSuccess: () => setEditing(false) })}
              >
                Save tag
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(tag.name)
                setEditing(true)
              }}
              aria-label={`Rename tag ${tag.name}`}
            >
              Rename
            </Button>
          )}
        </>
      )}
      {mutation.isError && <span role="alert">{apiErrorMessage(mutation.error)}</span>}
    </span>
  )
}
