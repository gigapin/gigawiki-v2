import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'

import { fetchPage } from '@/api/pages'
import { ProjectBreadcrumb } from '@/components/shared/ProjectBreadcrumb'
import { PageContent } from '@/components/pages/PageContent'
import { ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'

export function PageReaderPage() {
  const { slug } = useParams({ from: '/_auth/pages/$slug' })
  const query = useQuery({ queryKey: ['page', slug], queryFn: () => fetchPage(slug) })
  const user = useAuthStore((s) => s.user)
  const page = query.data
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-9">
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError || !page ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <ProjectBreadcrumb
            subject={page.project.subject}
            project={page.project}
            section={page.section}
            current={page.title}
          />
          <header className="space-y-4 border-b pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="min-w-0 break-words text-3xl font-semibold">{page.title}</h1>
              {user?.role !== 'GUEST' && user && (
                <Button variant="outline" asChild>
                  <Link to="/pages/$slug/edit" params={{ slug }}>
                    <Pencil /> Edit page
                  </Link>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{page.visibility}</Badge>
              {page.isDraft && <Badge variant="secondary">Draft</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Created by {page.createdBy.name} · Updated{' '}
              {new Date(page.updatedAt).toLocaleDateString('en-GB')}
            </p>
          </header>
          <PageContent key={`${page.id}:${page.currentRevision}`} content={page.content} />
        </>
      )}
    </div>
  )
}
