import { z } from 'zod'

export const UpdateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    newPassword: z.string().min(8).max(128).optional(),
    currentPassword: z.string().min(1).max(128).optional(),
    role: z.enum(['ADMIN', 'EDITOR', 'GUEST']).optional(),
  })
  .strict()

export const UserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['ADMIN', 'EDITOR', 'GUEST']).optional(),
  search: z.string().optional(),
})

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>
export type UserQuery = z.infer<typeof UserQuerySchema>
