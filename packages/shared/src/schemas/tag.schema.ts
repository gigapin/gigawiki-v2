import { z } from 'zod'

export const CreateTagSchema = z
  .object({
    name: z.string().min(1).max(50).toLowerCase(),
    pageId: z.string().optional(),
    projectId: z.string().optional(),
    sectionId: z.string().optional(),
  })
  .refine((data) => [data.pageId, data.projectId, data.sectionId].filter(Boolean).length === 1, {
    message: 'Exactly one of pageId, projectId, or sectionId must be provided',
  })

export type CreateTagDto = z.infer<typeof CreateTagSchema>
