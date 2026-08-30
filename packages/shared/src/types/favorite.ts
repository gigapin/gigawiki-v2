export interface Favorite {
  id: string
  userId: string
  pageId?: string | null
  projectId?: string | null
  sectionId?: string | null
  createdAt: Date
}
