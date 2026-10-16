import type { Visibility } from './subject.js'

export interface Section {
  id: string
  projectId: string
  title: string
  slug: string
  descriptionFormat?: 'text' | 'html'
  description: string | null
  position: number
  visibility: Visibility
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
