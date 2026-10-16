import { z } from 'zod'

import { BooleanQuery } from './request.schema.js'

export const CreateSubjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().optional(),
  descriptionFormat: z.enum(['text', 'html']).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  imageId: z.string().min(1).nullable().optional(),
})

export const UpdateSubjectSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().optional(),
  descriptionFormat: z.enum(['text', 'html']).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  imageId: z.string().nullable().optional(),
})

export const SubjectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  includeDeleted: BooleanQuery.default(false),
})

export type CreateSubjectDto = z.infer<typeof CreateSubjectSchema>
export type UpdateSubjectDto = z.infer<typeof UpdateSubjectSchema>
export type SubjectQuery = z.infer<typeof SubjectQuerySchema>
