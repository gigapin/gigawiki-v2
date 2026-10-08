import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { fetchSubjects } from '@/api/subjects'
import { fetchProjectsBySubject } from '@/api/projects'
import { useSections } from '@/api/sections'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { Pagination } from '@/components/shared/Pagination'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'

export function NewPageLocationPage() {
  const user = useAuthStore((s) => s.user)
  const [subject, setSubject] = useState<{ slug: string; name: string }>()
  const [project, setProject] = useState<{ slug: string; name: string }>()
  const [page, setPage] = useState(1)
  const subjects = useQuery({
    queryKey: ['subjects', 'page-picker', page],
    queryFn: () => fetchSubjects({ page, limit: 20 }),
    enabled: !subject,
  })
  const projects = useQuery({
    queryKey: ['subject', subject?.slug, 'page-picker', page],
    queryFn: () => fetchProjectsBySubject(subject!.slug, { page, limit: 20 }),
    enabled: Boolean(subject && !project),
  })
  const sections = useSections(project?.slug ?? '')
  if (!user || user.role === 'GUEST')
    return (
      <div className="p-6">
        <EmptyState
          title="Editor access required"
          description="An Editor or Admin can create pages."
        />
      </div>
    )
  const query = project ? sections : subject ? projects : subjects
  const items = project
    ? sections.data?.map((item) => ({ slug: item.slug, name: item.title }))
    : subject
      ? projects.data?.projects
      : subjects.data?.subjects
  const total = project ? undefined : subject ? projects.data?.total : subjects.data?.total
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-9">
      <h1 className="text-2xl font-semibold">New page</h1>
      <p className="text-muted-foreground">
        Choose the {project ? 'section' : subject ? 'project' : 'subject'} where your page will
        live.
      </p>
      {subject && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSubject(undefined)
              setProject(undefined)
              setPage(1)
            }}
          >
            All subjects
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setProject(undefined)
              setPage(1)
            }}
          >
            {subject.name}
          </Button>
          {project && <span className="self-center text-sm">{project.name}</span>}
        </div>
      )}
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : !items?.length ? (
        <EmptyState
          title={`No ${project ? 'sections' : subject ? 'projects' : 'subjects'} yet`}
          description="Create a subject, a project and a section before adding pages."
          action={
            <Button asChild variant="outline">
              <Link
                to={project ? '/projects/$slug' : '/subjects'}
                params={project ? { slug: project.slug } : {}}
              >
                Manage location
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.slug}>
              {project ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal py-4 text-left"
                >
                  <Link
                    to="/projects/$projectSlug/sections/$sectionSlug/pages/new"
                    params={{ projectSlug: project.slug, sectionSlug: item.slug }}
                  >
                    {item.name}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal py-4 text-left"
                  onClick={() => {
                    if (subject) setProject(item)
                    else setSubject(item)
                    setPage(1)
                  }}
                >
                  {item.name}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {total !== undefined && (
        <Pagination
          page={page}
          total={total}
          limit={20}
          onChange={setPage}
          disabled={query.isFetching}
        />
      )}
    </div>
  )
}
