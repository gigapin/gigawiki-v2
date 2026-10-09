import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { fetchPage, savePage, type PageInput } from '@/api/pages'
import { fetchProject } from '@/api/projects'
import { useSections } from '@/api/sections'
import { ProjectBreadcrumb } from '@/components/shared/ProjectBreadcrumb'
import { PageEditor } from '@/components/pages/PageEditor'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/ResourceState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'

type Context = {
  projectSlug: string
  projectName: string
  sectionId: string
  sectionTitle: string
  sectionSlug: string
  subject?: { name: string; slug: string }
}

export function NewPagePage() {
  const { projectSlug, sectionSlug } = useParams({
    from: '/_auth/projects/$projectSlug/sections/$sectionSlug/pages/new',
  })
  const project = useQuery({
    queryKey: ['project', projectSlug],
    queryFn: () => fetchProject(projectSlug),
  })
  const sections = useSections(projectSlug)
  const section = sections.data?.find((item) => item.slug === sectionSlug)
  if (project.isPending || sections.isPending)
    return (
      <div className="p-6">
        <ListSkeleton />
      </div>
    )
  if (project.isError || sections.isError || !project.data || !section)
    return (
      <div className="p-6">
        <ErrorState
          title="Cannot open this section"
          description={
            project.isError || sections.isError
              ? apiErrorMessage(project.error ?? sections.error)
              : 'This section no longer exists in this project.'
          }
          onRetry={() => {
            void project.refetch()
            void sections.refetch()
          }}
        />
      </div>
    )
  return (
    <PageForm
      key={section.id}
      context={{
        projectSlug,
        projectName: project.data.name,
        sectionId: section.id,
        sectionTitle: section.title,
        sectionSlug: section.slug,
        subject: project.data.subject,
      }}
      initial={{ title: '', content: '', isDraft: true, visibility: section.visibility }}
    />
  )
}

export function EditPagePage() {
  const { slug } = useParams({ from: '/_auth/pages/$slug/edit' })
  const page = useQuery({
    queryKey: ['page', slug],
    queryFn: () => fetchPage(slug),
    refetchOnWindowFocus: false,
  })
  if (page.isPending)
    return (
      <div className="p-6">
        <ListSkeleton />
      </div>
    )
  if (page.isError || !page.data)
    return (
      <div className="p-6">
        <ErrorState description={apiErrorMessage(page.error)} onRetry={() => void page.refetch()} />
      </div>
    )
  const data = page.data
  return (
    <PageForm
      key={data.id}
      slug={slug}
      context={{
        projectSlug: data.project.slug,
        projectName: data.project.name,
        sectionId: data.section.id,
        sectionTitle: data.section.title,
        sectionSlug: data.section.slug,
        subject: data.project.subject,
      }}
      initial={{
        title: data.title,
        content: data.content,
        isDraft: data.isDraft,
        visibility: data.visibility,
      }}
    />
  )
}

export function PageForm({
  context,
  initial,
  slug,
}: {
  context: Context
  initial: PageInput
  slug?: string
}) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const client = useQueryClient()
  const [input, setInput] = useState(initial)
  const [editorStatus, setEditorStatus] = useState({ uploading: false, invalid: false })
  const editorBusy = editorStatus.uploading || editorStatus.invalid
  const [saved, setSaved] = useState(false)
  const savedForNavigation = useRef(false)
  const [baseline, setBaseline] = useState(initial)
  const [activeSlug, setActiveSlug] = useState(slug)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const dirty = !saved && JSON.stringify(input) !== JSON.stringify(baseline)
  const mutation = useMutation({
    mutationFn: ({ payload }: { payload: PageInput; automatic: boolean }) =>
      savePage(payload, activeSlug ? { slug: activeSlug } : { sectionId: context.sectionId }),
    onSuccess: async (page, { payload, automatic }) => {
      setBaseline(payload)
      setInput(payload)
      setLastSaved(new Date())
      setSaved(true)
      savedForNavigation.current = true
      setActiveSlug(page.slug)
      if ((automatic || payload.isDraft) && activeSlug) {
        const previous = client.getQueryData(['page', activeSlug])
        if (previous) client.setQueryData(['page', page.slug], { ...previous, ...payload, ...page })
      }
      // A title change can change the URL: do not refetch the old slug.
      client.removeQueries({ queryKey: ['page', activeSlug], exact: true, type: 'inactive' })
      await Promise.all(
        [
          'page',
          'pages',
          'revisions',
          'revision',
          'sections',
          'project',
          'subject',
          'subjects',
          'stats',
          'activities',
        ].map((key) => client.invalidateQueries({ queryKey: [key], refetchType: 'none' })),
      )
      if (!automatic) toast.success(page.isDraft ? 'Draft saved' : 'Page published')
      if (automatic || payload.isDraft) {
        if (page.slug !== activeSlug)
          await navigate({ to: '/pages/$slug/edit', params: { slug: page.slug }, replace: true })
      } else {
        await navigate({ to: '/pages/$slug', params: { slug: page.slug } })
      }
    },
  })
  const { mutate, isPending } = mutation
  const allowed = user?.role === 'EDITOR' || user?.role === 'ADMIN'
  useEffect(() => {
    if (!activeSlug || !allowed || !dirty || editorBusy || isPending || !input.title.trim()) return
    const timer = window.setTimeout(() => {
      mutate({ payload: { ...input, title: input.title.trim() }, automatic: true })
    }, 30_000)
    return () => window.clearTimeout(timer)
  }, [activeSlug, allowed, dirty, editorBusy, input, isPending, mutate])
  const save = (isDraft: boolean) =>
    mutation.mutate({ payload: { ...input, title: input.title.trim(), isDraft }, automatic: false })
  const blocker = useBlocker({
    shouldBlockFn: () =>
      editorStatus.uploading || (!savedForNavigation.current && (dirty || mutation.isPending)),
    enableBeforeUnload: editorStatus.uploading || (!saved && (dirty || mutation.isPending)),
    withResolver: true,
  })
  if (!user || user.role === 'GUEST')
    return (
      <div className="p-6">
        <EmptyState
          title="Editor access required"
          description="An Editor or Admin can create and edit pages."
        />
      </div>
    )
  const change = (patch: Partial<PageInput>) => {
    savedForNavigation.current = false
    setSaved(false)
    setInput((value) => ({ ...value, ...patch }))
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-9">
      <ProjectBreadcrumb
        subject={context.subject}
        project={{ slug: context.projectSlug, name: context.projectName }}
        section={{ slug: context.sectionSlug, title: context.sectionTitle }}
        page={slug ? { slug, title: initial.title } : undefined}
        current={slug ? 'Edit page' : 'New page'}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{slug ? 'Edit page' : 'New page'}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={mutation.isPending || editorBusy || !input.title.trim()}
            onClick={() => save(true)}
          >
            {mutation.isPending && mutation.variables?.payload.isDraft
              ? 'Saving draft…'
              : 'Save draft'}
          </Button>
          <Button
            disabled={mutation.isPending || editorBusy || !input.title.trim()}
            onClick={() => save(false)}
          >
            {mutation.isPending ? 'Saving…' : 'Publish'}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="page-title">Title</Label>
        <Input
          id="page-title"
          maxLength={190}
          value={input.title}
          onChange={(e) => change({ title: e.target.value })}
          disabled={mutation.isPending}
          placeholder="Page title"
        />
      </div>
      <div className="max-w-xs space-y-2">
        <Label htmlFor="page-visibility">Visibility</Label>
        <Select
          value={input.visibility}
          onValueChange={(visibility: 'PUBLIC' | 'PRIVATE') => change({ visibility })}
          disabled={mutation.isPending}
        >
          <SelectTrigger id="page-visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="PRIVATE">Private</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(mutation.error)}
        </p>
      )}
      <PageEditor
        content={initial.content}
        onChange={(content) => change({ content })}
        disabled={mutation.isPending}
        onStatusChange={setEditorStatus}
      />
      <p className="text-xs text-muted-foreground">
        <span role="status">
          {mutation.isPending
            ? 'Saving…'
            : dirty
              ? 'Unsaved changes'
              : lastSaved
                ? `Saved at ${lastSaved.toLocaleTimeString()}`
                : 'No unsaved changes'}
        </span>
        {' · '}
        {activeSlug
          ? 'Changes save automatically after 30 seconds of inactivity.'
          : 'Save a draft to enable autosave, or publish when ready.'}
      </p>
      <Dialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>Your latest changes have not been saved.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
