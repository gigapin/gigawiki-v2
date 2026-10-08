import { AlertCircle, FolderOpen } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <FolderOpen className="size-8 text-muted-foreground" aria-hidden="true" />
      <h3 className="font-medium">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'Unable to load this content',
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center"
    >
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <h3 className="font-medium">{title}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading content" className="space-y-4">
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} className="h-20 w-full" />
      ))}
    </div>
  )
}
