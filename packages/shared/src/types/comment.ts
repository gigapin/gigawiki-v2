import type { UserPublic } from './user.js'

export interface Comment {
  id: string
  userId: string
  user?: UserPublic
  body: string
  parentId: string | null
  replies?: Comment[]
  pageId?: string | null
  projectId?: string | null
  sectionId?: string | null
  createdAt: Date
  updatedAt: Date
}
