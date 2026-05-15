import type { Visibility } from './subject.js'

export interface Section {
  id: string
  projectId: string
  title: string
  slug: string
  description: string | null
  position: number
  visibility: Visibility
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
