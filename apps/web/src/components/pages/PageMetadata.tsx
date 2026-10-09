import { useState } from 'react'
import { Star, X } from 'lucide-react'

import type { PageDetail } from '@/api/pages'
import { useToggleFavorite } from '@/api/favorites'
import { usePageTags, useTagSearch } from '@/api/tags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'

export function PageMetadata({ page }: { page: PageDetail }) {
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState('')
  const favorite = useToggleFavorite(page.slug, page.id)
  const { create, remove } = usePageTags(page.slug, page.id)
  const suggestions = useTagSearch(name)
  const tags = page.tags ?? []
  const canAdd = user?.role === 'EDITOR' || user?.role === 'ADMIN'
  const pending = create.isPending || remove.isPending
  const normalized = name.trim().toLowerCase()
  const duplicate = tags.some((tag) => tag.name.toLowerCase() === normalized)
  return (
    <section aria-label="Tags and favorites" className="space-y-3">
      <Button
        variant="outline"
        aria-pressed={Boolean(page.favorited)}
        disabled={!user || favorite.isPending}
        onClick={() => favorite.mutate()}
      >
        <Star className={page.favorited ? 'fill-current' : ''} />
        {page.favorited ? 'Remove favorite' : 'Add favorite'} ({page._count?.favorites ?? 0})
      </Button>
      {favorite.isError && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(favorite.error)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2" aria-label="Page tags">
        {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet</p>}
        {tags.map((tag) => (
          <Badge key={tag.id} variant="secondary">
            {tag.name}
            {(user?.role === 'ADMIN' || user?.id === tag.userId) && (
              <button
                type="button"
                aria-label={`Remove tag ${tag.name}`}
                disabled={pending}
                className="ml-2 rounded focus-visible:outline focus-visible:outline-2"
                onClick={() => remove.mutate(tag.id)}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      {canAdd && tags.length < 10 && (
        <form
          className="flex max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (normalized && !duplicate && !pending)
              create.mutate(normalized, { onSuccess: () => setName('') })
          }}
        >
          <Input
            aria-label="New tag"
            list={`tag-suggestions-${page.id}`}
            value={name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
            placeholder="Add a tag"
          />
          <datalist id={`tag-suggestions-${page.id}`}>
            {[...new Set((suggestions.data ?? []).map((tag) => tag.name))]
              .filter((value) => !tags.some((tag) => tag.name === value))
              .map((value) => (
                <option key={value} value={value} />
              ))}
          </datalist>
          <Button type="submit" disabled={pending || !normalized || duplicate}>
            Add tag
          </Button>
        </form>
      )}
      {canAdd && tags.length >= 10 && (
        <p className="text-sm text-muted-foreground">Maximum 10 tags per page</p>
      )}
      {(create.isError || remove.isError) && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(create.error ?? remove.error)}
        </p>
      )}
    </section>
  )
}
