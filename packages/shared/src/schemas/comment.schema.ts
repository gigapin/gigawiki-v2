import { z } from 'zod'

export const CreateCommentSchema = z
  .object({
    body: z.string().min(1),
    pageId: z.string().optional(),
    projectId: z.string().optional(),
    sectionId: z.string().optional(),
    parentId: z.string().optional(),
  })
  .refine((data) => [data.pageId, data.projectId, data.sectionId].filter(Boolean).length === 1, {
    message: 'Exactly one of pageId, projectId, or sectionId must be provided',
  })

export const UpdateCommentSchema = z.object({
  body: z.string().min(1),
})

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>
export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>
