import { useState, type ReactNode } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { descriptionText } from 'wiki-content/text'

import {
  useParityAction,
  useParityRead,
  type Association,
  type PageResult,
  type ResourceLink,
} from '@/api/parity'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/shared/Pagination'
import { ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { apiErrorMessage } from '@/lib/api-error'

export function ResourceDestination({ item }: { item: Association }) {
  if (item.page)
    return (
      <Link to="/pages/$slug" params={{ slug: item.page.slug }}>
        {item.page.title}
      </Link>
    )
  if (item.project)
    return (
      <Link to="/projects/$slug" params={{ slug: item.project.slug }}>
        {item.project.name}
      </Link>
    )
  if (item.section)
    return (
      <Link
        to="/projects/$slug"
        params={{ slug: item.section.project?.slug ?? '' }}
        search={{ section: item.section.slug }}
      >
        {item.section.title}
      </Link>
    )
  if (item.subject)
    return (
      <Link to="/subjects/$slug" params={{ slug: item.subject.slug }}>
        {item.subject.name}
      </Link>
    )
  return <span>Unavailable resource</span>
}
function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {children}
    </main>
  )
}

export function FavoritesPage() {
  const [page, setPage] = useState(1)
  const query = useParityRead<PageResult<Association, 'favorites'>>('favorites', '/favorites', {
    page,
    limit: 20,
  })
  const mutation = useParityAction('/favorites')
  return (
    <Screen title="Your favorites">
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.favorites.length === 0 && <p>No favorites yet.</p>}
          {query.data.favorites.map((item) => (
            <div className="flex justify-between rounded border p-3" key={item.id}>
              <ResourceDestination item={item} />
              <Button
                variant="outline"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate(
                    item.pageId
                      ? { pageId: item.pageId }
                      : item.projectId
                        ? { projectId: item.projectId }
                        : { sectionId: item.sectionId },
                  )
                }
              >
                Remove favorite
              </Button>
            </div>
          ))}
          <Pagination page={page} limit={20} total={query.data.total} onChange={setPage} />
        </>
      )}
      {mutation.isError && <p role="alert">{apiErrorMessage(mutation.error)}</p>}
    </Screen>
  )
}
export function ProjectsPage() {
  const [page, setPage] = useState(1)
  const [scope, setScope] = useState('mine')
  const [search, setSearch] = useState('')
  const query = useParityRead<
    PageResult<
      ResourceLink & { description: string; descriptionFormat: string; subject: { name: string } },
      'projects'
    >
  >('projects-index', '/projects', { page, limit: 20, scope, search })
  return (
    <Screen title="Projects">
      <div className="flex gap-3">
        <label>
          Show{' '}
          <select
            aria-label="Project scope"
            value={scope}
            onChange={(e) => {
              setScope(e.target.value)
              setPage(1)
            }}
          >
            <option value="mine">My projects</option>
            <option value="accessible">Accessible projects</option>
          </select>
        </label>
        <Input
          aria-label="Search projects"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          onRetry={() => void query.refetch()}
          description={apiErrorMessage(query.error)}
        />
      ) : (
        <>
          {query.data.projects.length === 0 && <p>No projects found.</p>}
          {query.data.projects.map((item) => (
            <article className="rounded border p-4" key={item.id}>
              <Link to="/projects/$slug" params={{ slug: item.slug }} className="font-semibold">
                {item.name}
              </Link>
              <p>{item.subject.name}</p>
              <p>{descriptionText(item.description, item.descriptionFormat)}</p>
            </article>
          ))}
          <Pagination page={page} limit={20} total={query.data.total} onChange={setPage} />
        </>
      )}
    </Screen>
  )
}
export function TagsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const query = useParityRead<PageResult<{ name: string; count: number }, 'tags'>>(
    'tags-catalog',
    '/tags/catalog',
    { page, limit: 20, search },
  )
  return (
    <Screen title="Tags">
      <Input
        aria-label="Search tags"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
      />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.tags.length === 0 && <p>No tags found.</p>}
          {query.data.tags.map((tag) => (
            <div className="flex justify-between border-b p-3" key={tag.name}>
              <Link to="/tags/$name" params={{ name: tag.name }}>
                {tag.name}
              </Link>
              <span>{tag.count} resources</span>
            </div>
          ))}
          <Pagination page={page} limit={20} total={query.data.total} onChange={setPage} />
        </>
      )}
    </Screen>
  )
}
export function TagResourcesPage() {
  const { name } = useParams({ from: '/_auth/tags/$name' })
  const [page, setPage] = useState(1)
  const query = useParityRead<PageResult<Association, 'tags'>>(
    'tags-catalog',
    `/tags/catalog/${encodeURIComponent(name)}`,
    { page, limit: 20 },
  )
  return (
    <Screen title={`Tag: ${name}`}>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.tags.length === 0 && <p>No accessible resources.</p>}
          {query.data.tags.map((item) => (
            <div className="rounded border p-3" key={item.id}>
              <ResourceDestination item={item} />
            </div>
          ))}
          <Pagination page={page} limit={20} total={query.data.total} onChange={setPage} />
        </>
      )}
    </Screen>
  )
}
