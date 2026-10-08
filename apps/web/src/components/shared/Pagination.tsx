import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function Pagination({
  page,
  total,
  limit,
  onChange,
  disabled = false,
}: {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
  disabled?: boolean
}) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (total <= limit) return null
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <span aria-live="polite" className="text-sm text-muted-foreground">
        Page {page} of {pages} · {total} items
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
