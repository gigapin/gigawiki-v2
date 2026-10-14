import { z } from 'zod'

export const CreateTagSchema = z
  .object({
    name: z.string().trim().min(1).max(50).toLowerCase(),
    pageId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
  })
  .refine((data) => [data.pageId, data.projectId, data.sectionId].filter(Boolean).length === 1, {
    message: 'Exactly one of pageId, projectId, or sectionId must be provided',
  })

export type CreateTagDto = z.infer<typeof CreateTagSchema>
