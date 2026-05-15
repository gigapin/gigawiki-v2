import { z } from 'zod'

export const CreateSectionSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(190),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
})

export const UpdateSectionSchema = z.object({
  title: z.string().min(1).max(190).optional(),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
})

export const ReorderSectionsSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string().min(1),
      position: z.number().int().min(0),
    }),
  ),
})

export type CreateSectionDto = z.infer<typeof CreateSectionSchema>
export type UpdateSectionDto = z.infer<typeof UpdateSectionSchema>
export type ReorderSectionsDto = z.infer<typeof ReorderSectionsSchema>
