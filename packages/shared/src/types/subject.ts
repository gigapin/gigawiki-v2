import type { Image } from './image.js'

export type Visibility = 'PUBLIC' | 'PRIVATE'

export interface Subject {
  id: string
  userId: string
  name: string
  slug: string
  descriptionFormat?: 'text' | 'html'
  description: string | null
  color: string
  icon: string
  imageId: string | null
  image?: Image | null
  visibility: Visibility
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
