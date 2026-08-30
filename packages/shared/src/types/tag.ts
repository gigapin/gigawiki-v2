export interface Tag {
  id: string
  userId: string
  name: string
  pageId?: string | null
  projectId?: string | null
  sectionId?: string | null
  createdAt: Date
}
