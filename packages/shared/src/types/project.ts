import type { Image } from './image.js'
import type { Visibility } from './subject.js'

export interface Project {
  id: string
  userId: string
  subjectId: string
  name: string
  slug: string
  description: string | null
  imageId: string | null
  image?: Image | null
  visibility: Visibility
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
