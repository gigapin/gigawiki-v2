import type { UserPublic } from './user.js'

export type ActivityType = 'CREATED' | 'UPDATED' | 'DELETED' | 'COMMENTED' | 'REPLIED' | 'RESTORED'
export type ResourceType = 'PAGE' | 'PROJECT' | 'SECTION' | 'SUBJECT'

export interface Activity {
  id: string
  userId: string
  user?: UserPublic
  type: ActivityType
  resourceType: ResourceType
  details: string | null
  ip: string | null
  pageId?: string | null
  projectId?: string | null
  sectionId?: string | null
  createdAt: Date
}
