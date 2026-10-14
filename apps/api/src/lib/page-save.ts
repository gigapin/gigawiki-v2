import type { FastifyRequest } from 'fastify'
import { UpdatePageSchema } from 'shared/schemas'

import { adminTransaction, apiError } from './admin-transaction.js'
import { recordActivity } from './activity.js'
import { generateUniqueSlug } from './slugify.js'

export const PAGE_SAVE_SELECT = {
  id: true,
  title: true,
  slug: true,
  position: true,
  visibility: true,
  isDraft: true,
  restricted: true,
  ownedById: true,
  currentRevision: true,
  sectionId: true,
  projectId: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, slug: true } },
}

export async function savePage(
  request: FastifyRequest,
  slug: string,
  replace = false,
  restore?: number,
) {
  if (request.user.role === 'GUEST') throw apiError(403, 'Editor or Admin role required')
  const parsed = UpdatePageSchema.safeParse(request.body ?? {})
  if (!parsed.success) throw apiError(400, 'Invalid page fields')
  return adminTransaction(async (tx) => {
    const existing = await tx.page.findFirst({ where: { slug, deletedAt: null } })
    if (!existing) throw apiError(404, 'Page not found')
    if (
      parsed.data.expectedRevision !== undefined &&
      parsed.data.expectedRevision !== existing.currentRevision
    )
      throw apiError(409, 'The page changed. Your draft is preserved; reload before saving again.')
    if (
      parsed.data.restricted !== undefined &&
      parsed.data.restricted !== existing.restricted &&
      request.user.role !== 'ADMIN' &&
      existing.ownedById !== request.user.id
    )
      throw apiError(403, 'Only the owner or Admin can change restrictions')
    if (parsed.data.ownedById !== undefined && request.user.role !== 'ADMIN')
      throw apiError(403, 'Only Admin can transfer ownership')
    if (
      parsed.data.ownedById &&
      !(await tx.user.findUnique({ where: { id: parsed.data.ownedById } }))
    )
      throw apiError(400, 'Owner not found')
    let input = parsed.data
    if (restore !== undefined) {
      const revision = await tx.revision.findFirst({
        where: { pageId: existing.id, revisionNumber: restore },
      })
      if (!revision) throw apiError(404, 'Revision not found')
      input = { ...input, title: revision.title, content: revision.content }
    }
    if (replace && (input.title === undefined || input.content === undefined))
      throw apiError(400, 'Title and content are required')
    const changed =
      (input.title !== undefined && input.title !== existing.title) ||
      (input.content !== undefined && input.content !== existing.content)
    const snapshot = replace || changed || restore !== undefined
    if (snapshot)
      await tx.revision.create({
        data: {
          pageId: existing.id,
          projectId: existing.projectId,
          sectionId: existing.sectionId,
          createdById: request.user.id,
          title: existing.title,
          content: existing.content,
          slug: existing.slug,
          revisionNumber: existing.currentRevision,
          summary:
            restore !== undefined
              ? `Restored revision ${restore}`
              : input.title !== existing.title && input.title !== undefined
                ? 'Updated title and/or content'
                : 'Updated content',
        },
      })
    const { expectedRevision: _expected, ...fields } = input
    const slugValue =
      input.title !== undefined && input.title !== existing.title
        ? await generateUniqueSlug(input.title, async (candidate) => {
            const match = await tx.page.findUnique({
              where: { slug: candidate },
              select: { id: true },
            })
            return Boolean(match && match.id !== existing.id)
          })
        : existing.slug
    const result = await tx.page.update({
      where: { id: existing.id, currentRevision: existing.currentRevision, deletedAt: null },
      data: {
        ...fields,
        slug: slugValue,
        updatedById: request.user.id,
        currentRevision: existing.currentRevision + (snapshot ? 1 : 0),
        ...(input.isDraft === false && existing.isDraft ? { publishedAt: new Date() } : {}),
      },
      select: PAGE_SAVE_SELECT,
    })
    await recordActivity(
      tx,
      request,
      'PAGE',
      result.id,
      restore === undefined ? 'UPDATED' : 'RESTORED',
      result.title,
    )
    return result
  }).catch((error) => {
    if (error?.code === 'P2025') throw apiError(409, 'The page changed. Your draft is preserved.')
    throw error
  })
}
