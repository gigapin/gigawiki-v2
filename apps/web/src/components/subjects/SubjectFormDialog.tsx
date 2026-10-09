import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Subject } from '@shared/types/subject'
import { toast } from 'sonner'

import { createSubject, updateSubject } from '@/api/subjects'
import { CoverField } from '@/components/shared/CoverField'
import { useCover } from '@/lib/use-cover'
import { ResourceFields } from '@/components/shared/ResourceFields'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { COVER_COLORS } from '@/styles/cover-colors'
import { apiErrorMessage } from '@/lib/api-error'

const ICONS = [
  'book',
  'folder',
  'doc',
  'hash',
  'tag',
  'globe',
  'spark',
  'lightning',
  'msg',
  'star',
  'users',
  'history',
]
export function SubjectFormDialog({
  subject,
  onClose,
  onSaved,
}: {
  subject?: Subject
  onClose: () => void
  onSaved?: (subject: Subject) => void
}) {
  const client = useQueryClient()
  const cover = useCover(subject?.image, subject?.imageId)
  const [values, setValues] = useState({
    name: subject?.name ?? '',
    description: subject?.description ?? '',
    visibility: subject?.visibility ?? 'PUBLIC',
  })
  const [color, setColor] = useState(subject?.color ?? 'emerald')
  const [icon, setIcon] = useState(subject?.icon ?? 'book')
  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
        color,
        icon,
        imageId: await cover.resolveImageId(),
      }
      return subject ? updateSubject(subject.slug, input) : createSubject(input)
    },
    onSuccess: async (saved) => {
      await Promise.all(
        [
          'subject',
          'subjects',
          'project',
          'projects',
          'pages',
          'page',
          'views',
          'favorites',
          'stats',
        ].map((key) => client.invalidateQueries({ queryKey: [key], refetchType: 'none' })),
      )
      if (subject) client.removeQueries({ queryKey: ['subject', subject.slug], type: 'inactive' })
      await client.invalidateQueries({ queryKey: ['subjects'] })
      toast.success(subject ? 'Subject updated' : 'Subject created')
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
        className="max-h-[90dvh] overflow-y-auto"
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{subject ? 'Edit subject' : 'New subject'}</DialogTitle>
          <DialogDescription>Organize projects under a subject.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (values.name.trim() && !mutation.isPending) mutation.mutate()
          }}
        >
          <ResourceFields
            id="subject"
            maxNameLength={100}
            values={values}
            onChange={setValues}
            disabled={mutation.isPending}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2">
              <Label asChild>
                <span>Color</span>
              </Label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                disabled={mutation.isPending}
                value={color}
                onChange={(event) => setColor(event.target.value)}
              >
                {COVER_COLORS.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <Label asChild>
                <span>Icon</span>
              </Label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                disabled={mutation.isPending}
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
              >
                {ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
            <Button disabled={!values.name.trim() || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : subject ? 'Save changes' : 'Create subject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
