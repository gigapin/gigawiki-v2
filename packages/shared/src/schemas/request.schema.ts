import { z } from 'zod'

export const BooleanQuery = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true')
export const RequestQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    includeDeleted: BooleanQuery.optional(),
    isDraft: BooleanQuery.optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    sort: z.enum(['createdAt', 'updatedAt', 'name', 'title', 'position']).optional(),
    resourceType: z.enum(['PAGE', 'PROJECT', 'SECTION', 'SUBJECT']).optional(),
    type: z
      .enum([
        'CREATED',
        'UPDATED',
        'DELETED',
        'COMMENTED',
        'REPLIED',
        'RESTORED',
        'AVATAR',
        'INLINE',
        'COVER',
      ])
      .optional(),
    q: z.string().trim().min(2).max(500).optional(),
    name: z.string().max(100).optional(),
    search: z.string().max(500).optional(),
    role: z.enum(['ADMIN', 'EDITOR', 'GUEST']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .passthrough()
export const ExpectedRevisionSchema = z.object({
  expectedRevision: z.number().int().min(0).optional(),
})

export const ResourceTargetSchema = z
  .object({
    pageId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
  })
  .refine((data) => [data.pageId, data.projectId, data.sectionId].filter(Boolean).length === 1, {
    message: 'Exactly one target is required',
  })
