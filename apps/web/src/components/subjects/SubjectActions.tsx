import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Subject } from '@shared/types/subject'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { SubjectFormDialog } from './SubjectFormDialog'

import { deleteSubject } from '@/api/subjects'
import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

export function SubjectActions({ subject }: { subject: Subject }) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const client = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deletion = useMutation({
    mutationFn: () => deleteSubject(subject.slug),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: ['subject', subject.slug] })
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
          'favorites-count',
          'stats',
        ].map((key) => client.invalidateQueries({ queryKey: [key], refetchType: 'none' })),
      )
      toast.success('Subject deleted')
      await navigate({ to: '/subjects' })
      client.removeQueries({ queryKey: ['subject', subject.slug] })
    },
  })
  const canEdit = user && (user.id === subject.userId || user.role === 'ADMIN')
  return (
    <div className="flex gap-2">
      {canEdit && (
        <Button
          variant="secondary"
          size="sm"
          disabled={deletion.isPending}
          onClick={() => setEditOpen(true)}
        >
          <Pencil />
          Edit subject
        </Button>
      )}
      {user?.role === 'ADMIN' && (
        <Button
          variant="destructive"
          size="sm"
          disabled={deletion.isPending}
          onClick={() => {
            deletion.reset()
            setDeleteOpen(true)
          }}
        >
          <Trash2 />
          Delete subject
        </Button>
      )}
      {editOpen && canEdit && (
        <SubjectFormDialog
          subject={subject}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => {
            if (saved.slug !== subject.slug)
              void navigate({ to: '/subjects/$slug', params: { slug: saved.slug } })
            else void client.invalidateQueries({ queryKey: ['subject', subject.slug] })
          }}
        />
      )}
      {user?.role === 'ADMIN' && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this subject?"
          description={`“${subject.name}” will be removed from browsing. You will return to Subjects.`}
          pending={deletion.isPending}
          error={deletion.isError ? apiErrorMessage(deletion.error) : undefined}
          onConfirm={() => {
            if (!deletion.isPending) deletion.mutate()
          }}
        />
      )}
    </div>
  )
}
