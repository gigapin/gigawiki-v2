import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'

export function CreateProjectModal({
  open,
  subjectId,
  subjectSlug,
  onClose,
}: {
  open: boolean
  subjectId: string
  subjectSlug: string
  onClose: () => void
}) {
  return open ? (
    <ProjectFormDialog subjectId={subjectId} subjectSlug={subjectSlug} onClose={onClose} />
  ) : null
}
