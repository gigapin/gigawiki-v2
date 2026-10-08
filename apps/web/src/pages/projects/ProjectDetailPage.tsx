import { useState } from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Folder,
  GripVertical,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'

import { deleteProject, fetchProject } from '@/api/projects'
import { usePages } from '@/api/pages'
import { useSectionMutations, useSections, type SectionWithCount } from '@/api/sections'
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'
import { SectionFormDialog } from '@/components/projects/SectionFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { ProjectBreadcrumb } from '@/components/shared/ProjectBreadcrumb'
import { Pagination } from '@/components/shared/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiErrorMessage } from '@/lib/api-error'
import { moveSection } from '@/lib/section-order'
import { useAuthStore } from '@/stores/auth.store'

const PAGE_SIZE = 10

export function ProjectDetailPage() {
  const { slug } = useParams({ from: '/_auth/projects/$slug' })
  const { section } = useSearch({ from: '/_auth/projects/$slug' })
  // Remount selection and dialogs when moving to another project.
  return <ProjectDetail key={`${slug}:${section ?? ''}`} slug={slug} sectionSlug={section} />
}

export function ProjectDetail({ slug, sectionSlug }: { slug: string; sectionSlug?: string }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const projectQuery = useQuery({ queryKey: ['project', slug], queryFn: () => fetchProject(slug) })
  const sectionsQuery = useSections(slug)
  const { remove, reorder } = useSectionMutations(slug)
  const [selectedId, setSelectedId] = useState<string>()
  const [page, setPage] = useState(1)
  const [editProject, setEditProject] = useState(false)
  const [sectionForm, setSectionForm] = useState<SectionWithCount | 'new' | null>(null)
  const [deleteSection, setDeleteSection] = useState<SectionWithCount | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const sections = sectionsQuery.data ?? []
  const activeSection =
    sections.find((section) =>
      selectedId ? section.id === selectedId : section.slug === sectionSlug,
    ) ?? sections[0]
  const pagesQuery = usePages(activeSection?.slug, page, PAGE_SIZE)
  const project = projectQuery.data
  const canCreate = user?.role === 'ADMIN' || user?.role === 'EDITOR'
  const canManage = Boolean(project && (user?.role === 'ADMIN' || user?.id === project.userId))
  const isAdmin = user?.role === 'ADMIN'
  const deletion = useMutation({
    mutationFn: () => deleteProject(slug),
    onSuccess: async () => {
      client.removeQueries({ queryKey: ['project', slug], exact: true })
      await client.invalidateQueries({ queryKey: ['subject'] })
      await client.invalidateQueries({ queryKey: ['subjects'] })
      toast.success('Project deleted')
      await navigate({ to: '/subjects' })
    },
  })

  function selectSection(id: string) {
    setSelectedId(id)
    setPage(1)
    const section = sections.find((item) => item.id === id)
    if (section)
      void navigate({ to: '/projects/$slug', params: { slug }, search: { section: section.slug } })
  }
  async function move(id: string, targetId: string) {
    if (!canCreate || reorder.isPending) return
    const ordered = moveSection(sections, id, targetId)
    if (!ordered) return
    try {
      await reorder.mutateAsync(ordered)
      toast.success('Section order updated')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  if (projectQuery.isPending)
    return (
      <div className="p-6 md:p-9">
        <ListSkeleton />
      </div>
    )
  if (projectQuery.isError || !project) {
    const status = isAxiosError(projectQuery.error)
      ? projectQuery.error.response?.status
      : undefined
    return (
      <div className="p-6 md:p-9">
        <ErrorState
          title={
            status === 404
              ? 'Project not found'
              : status === 403
                ? 'You do not have access to this project'
                : undefined
          }
          description={apiErrorMessage(projectQuery.error)}
          onRetry={() => void projectQuery.refetch()}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-9">
      <header className="space-y-4">
        <ProjectBreadcrumb subject={project.subject} project={project} current={project.name} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <Folder className="size-7 shrink-0 text-primary" aria-hidden="true" />
              <h1 className="break-words text-3xl font-semibold tracking-tight">{project.name}</h1>
            </div>
            {project.description && (
              <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {project.visibility === 'PRIVATE' && <Lock className="mr-1 size-3" />}
                {project.visibility}
              </Badge>
              {project.tags?.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setEditProject(true)}>
                <Pencil /> Edit project
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  deletion.reset()
                  setDeleteOpen(true)
                }}
              >
                <Trash2 /> Delete project
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Sections</CardTitle>
            {canCreate && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="New section"
                onClick={() => setSectionForm('new')}
              >
                <Plus />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {sectionsQuery.isPending ? (
              <ListSkeleton />
            ) : sectionsQuery.isError ? (
              <ErrorState
                description={apiErrorMessage(sectionsQuery.error)}
                onRetry={() => void sectionsQuery.refetch()}
              />
            ) : sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sections yet.</p>
            ) : (
              <ul aria-label="Project sections" className="space-y-1">
                {sections.map((section, index) => (
                  <li
                    key={section.id}
                    onDragOver={(event) => {
                      if (draggedId && canCreate && !reorder.isPending) event.preventDefault()
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (draggedId) void move(draggedId, section.id)
                      setDraggedId(null)
                    }}
                    className={
                      activeSection?.id === section.id ? 'rounded-md bg-accent' : 'rounded-md'
                    }
                  >
                    <div className="flex items-center gap-1">
                      {canCreate && (
                        <button
                          type="button"
                          disabled={reorder.isPending}
                          draggable={!reorder.isPending}
                          aria-label={`Drag ${section.title} to reorder`}
                          title="Drag to reorder, or use the move buttons below"
                          className="cursor-grab rounded p-1 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', section.id)
                            setDraggedId(section.id)
                          }}
                          onDragEnd={() => setDraggedId(null)}
                        >
                          <GripVertical className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-current={activeSection?.id === section.id ? 'true' : undefined}
                        onClick={() => selectSection(section.id)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="truncate">{section.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {section._count.pages}
                        </span>
                      </button>
                    </div>
                    {canCreate && (
                      <div className="flex justify-end gap-1 px-2 pb-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label={`Move ${section.title} up`}
                          disabled={index === 0 || reorder.isPending}
                          onClick={() => void move(section.id, sections[index - 1].id)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label={`Move ${section.title} down`}
                          disabled={index === sections.length - 1 || reorder.isPending}
                          onClick={() => void move(section.id, sections[index + 1].id)}
                        >
                          <ArrowDown />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {reorder.isPending && (
              <p role="status" className="text-xs text-muted-foreground">
                Saving section order…
              </p>
            )}
          </CardContent>
        </Card>

        <section className="min-w-0 space-y-4" aria-label="Section pages">
          {sectionsQuery.isPending || sectionsQuery.isError ? null : !activeSection ? (
            <EmptyState
              title="Create your first section"
              description="Sections organize the pages in this project."
              action={
                canCreate && (
                  <Button onClick={() => setSectionForm('new')}>
                    <Plus /> New section
                  </Button>
                )
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">{activeSection.title}</h2>
                  {activeSection.description && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {activeSection.description}
                    </p>
                  )}
                  <Badge variant="outline">{activeSection.visibility}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canCreate && (
                    <Button size="sm" asChild>
                      <Link
                        to="/projects/$projectSlug/sections/$sectionSlug/pages/new"
                        params={{ projectSlug: slug, sectionSlug: activeSection.slug }}
                      >
                        <Plus /> New page
                      </Link>
                    </Button>
                  )}
                  {canManage && (
                    <Button variant="ghost" size="sm" onClick={() => setSectionForm(activeSection)}>
                      <Pencil /> Edit section
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        remove.reset()
                        setDeleteSection(activeSection)
                      }}
                    >
                      <Trash2 /> Delete section
                    </Button>
                  )}
                </div>
              </div>
              {pagesQuery.isPending ? (
                <ListSkeleton />
              ) : pagesQuery.isError ? (
                <ErrorState
                  description={apiErrorMessage(pagesQuery.error)}
                  onRetry={() => void pagesQuery.refetch()}
                />
              ) : pagesQuery.data?.pages.length === 0 ? (
                <EmptyState
                  title="No pages in this section"
                  description="Pages added to this section will appear here."
                />
              ) : (
                <Card>
                  <CardContent className="divide-y p-0">
                    <ul className="divide-y">
                      {pagesQuery.data?.pages.map((item) => (
                        <li key={item.id} className="flex items-start gap-3 p-4">
                          <FileText
                            className="mt-1 size-5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <h3 className="break-words font-medium">
                              <Link
                                className="hover:underline"
                                to="/pages/$slug"
                                params={{ slug: item.slug }}
                              >
                                {item.title}
                              </Link>
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {item.isDraft && <Badge variant="secondary">Draft</Badge>}
                              <Badge variant="outline">{item.visibility}</Badge>
                              {item.restricted && (
                                <Badge variant="outline">
                                  <Lock className="mr-1 size-3" />
                                  Restricted
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Created by {item.createdBy.name} · Updated{' '}
                              <time dateTime={new Date(item.updatedAt).toISOString()}>
                                {new Date(item.updatedAt).toLocaleDateString('en-GB')}
                              </time>
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {pagesQuery.data && (
                <Pagination
                  page={page}
                  total={pagesQuery.data.total}
                  limit={PAGE_SIZE}
                  disabled={pagesQuery.isFetching}
                  onChange={setPage}
                />
              )}
            </>
          )}
        </section>
      </div>

      {editProject && (
        <ProjectFormDialog
          project={project}
          subjectId={project.subjectId}
          onClose={() => setEditProject(false)}
          onSaved={(saved) => {
            if (saved.slug !== slug)
              void navigate({ to: '/projects/$slug', params: { slug: saved.slug } })
          }}
        />
      )}
      {sectionForm && (
        <SectionFormDialog
          section={sectionForm === 'new' ? undefined : sectionForm}
          projectId={project.id}
          projectSlug={slug}
          onClose={() => setSectionForm(null)}
          onSaved={(saved) => {
            selectSection(saved.id)
          }}
        />
      )}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this project?"
        description="The project will be removed from browsing. This action is only available to administrators."
        pending={deletion.isPending}
        error={deletion.isError ? apiErrorMessage(deletion.error) : undefined}
        onConfirm={() => deletion.mutate()}
      />
      <ConfirmDialog
        open={Boolean(deleteSection)}
        onOpenChange={(open) => {
          if (!open) setDeleteSection(null)
        }}
        title="Delete this section?"
        description="The section will be removed from this project."
        pending={remove.isPending}
        error={remove.isError ? apiErrorMessage(remove.error) : undefined}
        onConfirm={() => {
          if (deleteSection)
            remove.mutate(deleteSection.slug, {
              onSuccess: () => {
                setDeleteSection(null)
                setPage(1)
              },
            })
        }}
      />
    </div>
  )
}
