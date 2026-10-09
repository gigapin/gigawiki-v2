import { SubjectFormDialog } from './SubjectFormDialog'
export function CreateSubjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <SubjectFormDialog onClose={onClose} /> : null
}
