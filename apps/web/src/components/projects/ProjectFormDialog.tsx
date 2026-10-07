import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Project } from '@shared/types/project'
import { toast } from 'sonner'

import { createProject, updateProject } from '@/api/projects'
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
  const client = useQueryClient()
  const [values, setValues] = useState<ResourceValues>({
    name: project?.name ?? '',
    description: project?.description ?? '',
    visibility: project?.visibility ?? 'PUBLIC',
  })
  const mutation = useMutation({
    mutationFn: () => {
      const input = { ...values, name: values.name.trim(), description: values.description.trim() }
      return project ? updateProject(project.slug, input) : createProject({ ...input, subjectId })
    },
    onSuccess: async (saved) => {
      if (project) {
        client.setQueryData(['project', saved.slug], {
          ...client.getQueryData<Project>(['project', project.slug]),
          ...saved,
        })
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ['project'], refetchType: 'none' }),
        client.invalidateQueries({
          queryKey: subjectSlug ? ['subject', subjectSlug] : ['subject'],
        }),
        client.invalidateQueries({ queryKey: ['subjects'] }),
      ])
      toast.success(project ? 'Project updated' : 'Project created')
      onSaved?.(saved)
      onClose()
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
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
          <ResourceFields
            id="project"
            values={values}
            onChange={setValues}
            disabled={mutation.isPending}
          />
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
