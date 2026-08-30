import type { Image } from './image.js'

export type Role = 'ADMIN' | 'EDITOR' | 'GUEST'

export interface User {
  id: string
  name: string
  email: string
  slug: string
  role: Role
  avatarId: string | null
  avatar?: Image | null
  emailConfirmed: boolean
  createdAt: Date
  updatedAt: Date
}

export type UserPublic = Pick<User, 'id' | 'name' | 'slug' | 'role' | 'avatarId' | 'avatar'>
