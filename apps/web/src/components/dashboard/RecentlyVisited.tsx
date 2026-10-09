import { Link } from '@tanstack/react-router'
import { BookOpen, Folder, History } from 'lucide-react'

import { useRecentViews } from '@/api/views'
import type { RecentView } from '@/api/views'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { Badge } from '@/components/ui/badge'
import { apiErrorMessage } from '@/lib/api-error'

function visitedLabel(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (minutes < 60) return formatter.format(-minutes, 'minute')
  if (minutes < 1440) return formatter.format(-Math.floor(minutes / 60), 'hour')
  return formatter.format(-Math.floor(minutes / 1440), 'day')
}
function RecentViewCard({ view }: { view: RecentView }) {
  const resource = view.page ?? view.project ?? view.section
  if (!resource) return null
  const type = view.page ? 'Page' : view.project ? 'Project' : 'Section'
  const title = 'title' in resource ? resource.title : resource.name
  const Glyph = view.page ? BookOpen : Folder
  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-secondary p-2 text-primary">
          <Glyph className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium">{title}</p>
          <Badge variant="outline" className="mt-1">
            {type}
          </Badge>
        </div>
      </div>
      <time
        dateTime={view.lastSeenAt}
        title={new Date(view.lastSeenAt).toLocaleString('en-GB')}
        className="mt-3 block text-xs text-muted-foreground"
      >
        Visited {visitedLabel(view.lastSeenAt)}
      </time>
    </>
  )
  const className =
    'block rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  if (view.page)
    return (
      <Link className={className} to="/pages/$slug" params={{ slug: view.page.slug }}>
        {content}
      </Link>
    )
  if (view.project)
    return (
      <Link className={className} to="/projects/$slug" params={{ slug: view.project.slug }}>
        {content}
      </Link>
    )
  if (view.section)
    return (
      <Link
        className={className}
        to="/projects/$slug"
        params={{ slug: view.section.project.slug }}
        search={{ section: view.section.slug }}
      >
        {content}
      </Link>
    )
  return null
}
export function RecentlyVisited() {
  const query = useRecentViews()
  return (
    <section aria-label="Recently visited" className="mt-6 space-y-4">
      <h2
        className="flex items-center gap-2 text-2xl font-normal"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <History className="size-5 text-muted-foreground" />
        Recently visited
      </h2>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.views.length === 0 ? (
        <EmptyState
          title="No recent visits yet"
          description="Pages and projects you open will appear here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.views.map((view) => (
            <RecentViewCard key={view.id} view={view} />
          ))}
        </div>
      )}
    </section>
  )
}
