import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(190),
  subjectId: z.string().min(1),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(190).optional(),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  imageId: z.string().nullable().optional(),
})

export const ProjectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  includeDeleted: z.coerce.boolean().default(false),
})

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>
export type ProjectQuery = z.infer<typeof ProjectQuerySchema>
