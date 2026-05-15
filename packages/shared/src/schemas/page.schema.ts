import { z } from 'zod'

export const CreatePageSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  sectionId: z.string().min(1),
  isDraft: z.boolean().default(false),
})

export const UpdatePageSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  isDraft: z.boolean().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  restricted: z.boolean().optional(),
  ownedById: z.string().optional(),
})

export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  isDraft: z.coerce.boolean().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  projectId: z.string().optional(),
  sectionId: z.string().optional(),
  search: z.string().optional(),
})

export type CreatePageDto = z.infer<typeof CreatePageSchema>
export type UpdatePageDto = z.infer<typeof UpdatePageSchema>
export type PageQuery = z.infer<typeof PageQuerySchema>
