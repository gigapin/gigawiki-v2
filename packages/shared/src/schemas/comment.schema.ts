import { z } from 'zod'

export const CreateCommentSchema = z
  .object({
    body: z.string().trim().min(1).max(10000),
    pageId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
    parentId: z.string().min(1).optional(),
  })
  .refine((data) => [data.pageId, data.projectId, data.sectionId].filter(Boolean).length === 1, {
    message: 'Exactly one of pageId, projectId, or sectionId must be provided',
  })

export const UpdateCommentSchema = z.object({
  body: z.string().trim().min(1).max(10000),
})

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>
export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>
