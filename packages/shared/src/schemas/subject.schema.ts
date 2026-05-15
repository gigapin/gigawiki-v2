import { z } from 'zod'

export const CreateSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
})

export const UpdateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  imageId: z.string().nullable().optional(),
})

export const SubjectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  includeDeleted: z.coerce.boolean().default(false),
})

export type CreateSubjectDto = z.infer<typeof CreateSubjectSchema>
export type UpdateSubjectDto = z.infer<typeof UpdateSubjectSchema>
export type SubjectQuery = z.infer<typeof SubjectQuerySchema>
