import type { UserPublic } from './user.js'
import type { Visibility } from './subject.js'

export interface Page {
  id: string
  createdById: string
  createdBy?: UserPublic
  updatedById: string
  updatedBy?: UserPublic
  ownedById: string
  ownedBy?: UserPublic
  projectId: string
  sectionId: string
  title: string
  slug: string
  content: string
  position: number
  visibility: Visibility
  restricted: boolean
  currentRevision: number
  isDraft: boolean
  deletedAt: Date | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
