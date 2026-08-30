import type { UserPublic } from './user.js'

export interface Revision {
  id: string
  pageId: string
  projectId: string
  sectionId: string
  createdById: string
  createdBy?: UserPublic
  title: string
  content: string
  slug: string
  summary: string | null
  revisionNumber: number
  createdAt: Date
}
