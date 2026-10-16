export interface Tag {
  id: string
  userId: string
  name: string
  subjectId?: string | null
  pageId?: string | null
  projectId?: string | null
  sectionId?: string | null
  createdAt: Date
}
