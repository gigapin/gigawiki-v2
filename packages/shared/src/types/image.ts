export type ImageType = 'COVER' | 'AVATAR' | 'INLINE'

export interface Image {
  id: string
  name: string
  url: string
  path: string
  type: ImageType
  createdById: string
  updatedById: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateImageDto {
  name: string
  url: string
  path: string
  type: ImageType
}
