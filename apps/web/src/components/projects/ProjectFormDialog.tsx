import { useState } from 'react'
import type { Project } from '@shared/types/project'
import { toast } from 'sonner'

import { useSubjects } from '@/api/subjects'
import { useCover } from '@/lib/use-cover'
import { CoverField } from '@/components/shared/CoverField'
import { useSaveProject } from '@/api/projects'
import { ResourceFields, type ResourceValues } from '@/components/shared/ResourceFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiErrorMessage } from '@/lib/api-error'

export function ProjectFormDialog({
  project,
  subjectId,
  subjectSlug,
  onClose,
  onSaved,
}: {
  project?: Project
  subjectId: string
  subjectSlug?: string
  onClose: () => void
  onSaved?: (project: Project) => void
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId)
  const [subjectPage, setSubjectPage] = useState(1)
  const subjects = useSubjects({ page: subjectPage, limit: 100 })
  const cover = useCover(project?.image, project?.imageId)
  const [values, setValues] = useState<ResourceValues>({
    name: project?.name ?? '',
    description: project?.description ?? '',
    visibility: project?.visibility ?? 'PUBLIC',
  })
  const mutation = useSaveProject(
    async () => {
      const input = {
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
        imageId: await cover.resolveImageId(),
      }
      return { ...input, subjectId: selectedSubjectId }
    },
    project?.slug,
    subjectSlug,
    {
      onSuccess: async (saved) => {
        toast.success(project ? 'Project updated' : 'Project created')
        onSaved?.(saved)
        onClose()
      },
    },
  )
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{project ? 'Edit project' : 'New project'}</DialogTitle>
          <DialogDescription>Organize related knowledge in one project.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (values.name.trim() && !mutation.isPending) mutation.mutate()
          }}
        >
          <label className="block space-y-2">
            Subject
            <select
              aria-label="Subject"
              className="w-full rounded border p-2"
              value={selectedSubjectId}
              disabled={mutation.isPending}
              onChange={(event) => setSelectedSubjectId(event.target.value)}
            >
              {!subjects.data?.subjects.some((item) => item.id === selectedSubjectId) && (
                <option value={selectedSubjectId}>Current subject</option>
              )}
              {subjects.data?.subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            {subjectPage > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubjectPage((value) => value - 1)}
              >
                Previous subjects
              </Button>
            )}
            {subjectPage * 100 < (subjects.data?.total ?? 0) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubjectPage((value) => value + 1)}
              >
                More subjects
              </Button>
            )}
          </div>
          {subjects.isError && (
            <p role="alert">
              Subjects unavailable.{' '}
              <button type="button" onClick={() => void subjects.refetch()}>
                Retry
              </button>
            </p>
          )}
          <ResourceFields
            id="project"
            maxNameLength={100}
            values={values}
            onChange={setValues}
            disabled={mutation.isPending}
          />
          <CoverField cover={cover} disabled={mutation.isPending} />
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(mutation.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!values.name.trim() || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : project ? 'Save changes' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
