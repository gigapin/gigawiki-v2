import { useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deletePage, fetchPage } from '@/api/pages'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
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
  const navigate = useNavigate()
  const client = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deletion = useMutation({
    mutationFn: () => deletePage(slug),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: ['page', slug], exact: true })
      await Promise.all(
        [
          'pages',
          'sections',
          'section',
          'project',
          'projects',
          'subject',
          'subjects',
          'stats',
          'activities',
          'favorites',
          'favorites-count',
          'activities-count',
          'views',
          'search',
        ].map((key) => client.invalidateQueries({ queryKey: [key], refetchType: 'none' })),
      )
      toast.success('Page deleted')
      if (page) {
        await navigate({
          to: '/projects/$slug',
          params: { slug: page.project.slug },
          search: { section: page.section.slug },
        })
      }
      client.removeQueries({ queryKey: ['page', slug], exact: true })
    },
  })
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
              <div className="flex flex-wrap gap-2">
                {(user?.role === 'EDITOR' || user?.role === 'ADMIN') && (
                  <Button variant="outline" disabled={deletion.isPending} asChild>
                    <Link to="/pages/$slug/edit" params={{ slug }}>
                      <Pencil /> Edit page
                    </Link>
                  </Button>
                )}
                {user?.role === 'ADMIN' && (
                  <Button
                    variant="destructive"
                    disabled={deletion.isPending}
                    onClick={() => {
                      deletion.reset()
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 /> Delete page
                  </Button>
                )}
              </div>
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
          {user?.role === 'ADMIN' && (
            <ConfirmDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title="Delete this page?"
              description={`“${page.title}” will be removed from browsing. You will return to its section.`}
              pending={deletion.isPending}
              error={deletion.isError ? apiErrorMessage(deletion.error) : undefined}
              onConfirm={() => {
                if (!deletion.isPending) deletion.mutate()
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
