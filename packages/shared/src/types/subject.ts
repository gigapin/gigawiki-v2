import type { Image } from './image.js'

export type Visibility = 'PUBLIC' | 'PRIVATE'

export interface Subject {
  id: string
  userId: string
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
