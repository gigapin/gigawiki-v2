import { useState } from 'react'
import type { Section } from '@shared/types/section'
import { toast } from 'sonner'

import { useSectionMutations } from '@/api/sections'
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

export function SectionFormDialog({
  section,
  projectId,
  projectSlug,
  onClose,
  onSaved,
}: {
  section?: Section
  projectId: string
  projectSlug: string
  onClose: () => void
  onSaved: (section: Section) => void
}) {
  const [values, setValues] = useState<ResourceValues>({
    name: section?.title ?? '',
    description: section?.description ?? '',
    visibility: section?.visibility ?? 'PUBLIC',
  })
  const { save } = useSectionMutations(projectSlug)
  async function submit() {
    try {
      const saved = await save.mutateAsync({
        projectId,
        slug: section?.slug,
        title: values.name.trim(),
        description: values.description.trim(),
        visibility: values.visibility,
      })
      toast.success(section ? 'Section updated' : 'Section created')
      onSaved(saved)
      onClose()
    } catch {
      /* The API error is displayed in the form. */
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose()
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (save.isPending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (save.isPending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{section ? 'Edit section' : 'New section'}</DialogTitle>
          <DialogDescription>
            Group pages into an ordered section of this project.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (values.name.trim() && !save.isPending) void submit()
          }}
        >
          <ResourceFields
            id="section"
            values={values}
            onChange={setValues}
            disabled={save.isPending}
          />
          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(save.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!values.name.trim() || save.isPending}>
              {save.isPending ? 'Saving…' : section ? 'Save changes' : 'Create section'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
