import { z } from 'zod'

import { BooleanQuery } from './request.schema.js'

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  subjectId: z.string().min(1),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  imageId: z.string().min(1).nullable().optional(),
})

export const UpdateProjectSchema = z.object({
  subjectId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  imageId: z.string().nullable().optional(),
})

export const ProjectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeDeleted: BooleanQuery.default(false),
})

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>
export type ProjectQuery = z.infer<typeof ProjectQuerySchema>
