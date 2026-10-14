import { z } from 'zod'

import { BooleanQuery } from './request.schema.js'

export const CreatePageSchema = z.object({
  title: z.string().trim().min(1).max(190),
  content: z.string().default(''),
  sectionId: z.string().min(1),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  restricted: z.boolean().optional(),
  isDraft: z.boolean().default(false),
})

export const UpdatePageSchema = z.object({
  title: z.string().trim().min(1).max(190).optional(),
  content: z.string().optional(),
  isDraft: z.boolean().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  restricted: z.boolean().optional(),
  ownedById: z.string().min(1).optional(),
  expectedRevision: z.number().int().min(0).optional(),
})

export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  isDraft: BooleanQuery.optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  projectId: z.string().optional(),
  sectionId: z.string().optional(),
  search: z.string().optional(),
})

export type CreatePageDto = z.infer<typeof CreatePageSchema>
export type UpdatePageDto = z.infer<typeof UpdatePageSchema>
export type PageQuery = z.infer<typeof PageQuerySchema>
