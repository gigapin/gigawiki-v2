import { createHash } from 'node:crypto'

import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import {
  adminTransaction,
  apiError,
  protectLastAdmin,
  requireAdmin,
} from '../../lib/admin-transaction.js'

// Read precisely the graph whose fate the administrator is confirming. Include IDs
// and timestamps in the fingerprint so equal counts cannot hide changed resources.
export async function buildDeletionPreview(tx: Prisma.TransactionClient, id: string) {
  const user = await tx.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, updatedAt: true },
  })
  if (!user) throw apiError(404, 'User not found')
  const projects = await tx.project.findMany({
    where: { OR: [{ userId: id }, { subject: { userId: id } }] },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      userId: true,
      subjectId: true,
      updatedAt: true,
      pages: { orderBy: { id: 'asc' }, select: { id: true, createdById: true, updatedAt: true } },
      comments: { orderBy: { id: 'asc' }, select: { id: true, userId: true, updatedAt: true } },
      tags: { orderBy: { id: 'asc' }, select: { id: true, userId: true } },
      sections: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          updatedAt: true,
          comments: { orderBy: { id: 'asc' }, select: { id: true, userId: true, updatedAt: true } },
          tags: { orderBy: { id: 'asc' }, select: { id: true, userId: true } },
        },
      },
    },
  })
  const subjectRows = await tx.subject.findMany({
    where: { userId: id },
    orderBy: { id: 'asc' },
    select: { id: true, updatedAt: true },
  })
  const pages = await tx.page.findMany({
    where: { OR: [{ createdById: id }, { ownedById: id }, { updatedById: id }] },
    orderBy: { id: 'asc' },
    select: { id: true, createdById: true, ownedById: true, updatedById: true, updatedAt: true },
  })
  const deletedPages = pages.filter((p) => p.createdById === id).map((p) => p.id)
  const deletedProjects = projects
    .filter(
      (p) =>
        p.userId === id &&
        !p.pages.some((v) => v.createdById !== id) &&
        !p.comments.some((v) => v.userId !== id) &&
        !p.tags.some((v) => v.userId !== id) &&
        !p.sections.some(
          (s) => s.comments.some((v) => v.userId !== id) || s.tags.some((v) => v.userId !== id),
        ),
    )
    .map((p) => p.id)
  const deletedSubjects = subjectRows
    .filter((s) => !projects.some((p) => p.subjectId === s.id && !deletedProjects.includes(p.id)))
    .map((s) => s.id)
  const transferredProjects = projects
    .filter((p) => p.userId === id && !deletedProjects.includes(p.id))
    .map((p) => p.id)
  const transferredSubjects = subjectRows
    .filter((s) => !deletedSubjects.includes(s.id))
    .map((s) => s.id)
  const deletedSections = projects
    .filter((p) => deletedProjects.includes(p.id))
    .flatMap((p) => p.sections.map((s) => s.id))
  const targets = [
    { pageId: { in: deletedPages } },
    { projectId: { in: deletedProjects } },
    { sectionId: { in: deletedSections } },
  ]
  const revisions = await tx.revision.findMany({
    where: { OR: [{ createdById: id }, { pageId: { in: deletedPages } }] },
    orderBy: { id: 'asc' },
    select: { id: true, updatedAt: true },
  })
  const comments = await tx.comment.findMany({
    where: { OR: [{ userId: id }, { parent: { userId: id } }, ...targets] },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      userId: true,
      parentId: true,
      updatedAt: true,
      pageId: true,
      projectId: true,
      sectionId: true,
    },
  })
  const tags = await tx.tag.findMany({
    where: { OR: [{ userId: id }, ...targets] },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
  const images = await tx.image.findMany({
    where: { OR: [{ createdById: id }, { updatedById: id }] },
    orderBy: { id: 'asc' },
    select: { id: true, updatedAt: true },
  })
  const invites = await tx.emailInvite.findMany({
    where: { sentById: id },
    orderBy: { id: 'asc' },
    select: { id: true, updatedAt: true },
  })
  const onDeletedTarget = (c: (typeof comments)[number]) =>
    deletedPages.includes(c.pageId ?? '') ||
    deletedProjects.includes(c.projectId ?? '') ||
    deletedSections.includes(c.sectionId ?? '')
  const promotedReplies = comments.filter(
    (c) => c.userId !== id && c.parentId && !onDeletedTarget(c),
  )
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        user,
        projects,
        subjectRows,
        pages,
        revisions,
        comments,
        tags,
        images,
        invites,
      }),
    )
    .digest('hex')
  return {
    user: { id: user.id, name: user.name, email: user.email },
    fingerprint,
    counts: {
      pages: deletedPages.length,
      projects: deletedProjects.length,
      subjects: deletedSubjects.length,
      sections: deletedSections.length,
      revisions: revisions.length,
      comments: comments.filter((c) => c.userId === id || onDeletedTarget(c)).length,
      tags: tags.length,
      transferredProjects: transferredProjects.length,
      transferredSubjects: transferredSubjects.length,
      transferredPages: pages.filter((p) => p.createdById !== id).length,
      promotedReplies: promotedReplies.length,
      preservedImages: images.length,
      transferredInvites: invites.length,
    },
    ids: {
      deletedPages,
      deletedProjects,
      deletedSubjects,
      transferredProjects,
      transferredSubjects,
      promotedReplies: promotedReplies.map((c) => c.id),
    },
  }
}

export async function executeUserDeletion(
  tx: Prisma.TransactionClient,
  id: string,
  actorId: string,
  fingerprint: string,
) {
  if (id === actorId) throw apiError(409, 'You cannot delete your own account.')
  await requireAdmin(tx, actorId)
  await protectLastAdmin(tx, id)
  const preview = await buildDeletionPreview(tx, id)
  if (preview.fingerprint !== fingerprint)
    throw apiError(409, 'Content changed. Review a new deletion preview before confirming.')
  const { ids } = preview
  await tx.comment.updateMany({
    where: { id: { in: ids.promotedReplies } },
    data: { parentId: null },
  })
  await tx.comment.deleteMany({ where: { userId: id } })
  await tx.revision.deleteMany({ where: { createdById: id } })
  await tx.page.deleteMany({ where: { id: { in: ids.deletedPages } } })
  await tx.project.deleteMany({ where: { id: { in: ids.deletedProjects } } })
  await tx.subject.deleteMany({ where: { id: { in: ids.deletedSubjects } } })
  await tx.project.updateMany({ where: { userId: id }, data: { userId: actorId } })
  await tx.subject.updateMany({ where: { userId: id }, data: { userId: actorId } })
  await tx.page.updateMany({ where: { ownedById: id }, data: { ownedById: actorId } })
  await tx.page.updateMany({ where: { updatedById: id }, data: { updatedById: actorId } })
  await tx.image.updateMany({ where: { createdById: id }, data: { createdById: actorId } })
  await tx.image.updateMany({ where: { updatedById: id }, data: { updatedById: actorId } })
  await tx.emailInvite.updateMany({ where: { sentById: id }, data: { sentById: actorId } })
  await tx.refreshToken.deleteMany({ where: { userId: id } })
  // Remaining personal metadata cascades; all content ownership was handled above.
  await tx.user.delete({ where: { id } })
}

export async function deletionPreview(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>('/users/:id/deletion-preview', async (req, reply) => {
    if (req.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin access required' })
    const preview = await adminTransaction(async (tx) => {
      if (req.params.id === req.user.id) throw apiError(409, 'You cannot delete your own account.')
      await requireAdmin(tx, req.user.id)
      await protectLastAdmin(tx, req.params.id)
      return buildDeletionPreview(tx, req.params.id)
    })
    const { ids: _ids, ...result } = preview
    return reply.send(result)
  })
}
export async function deleteUser(fastify: FastifyInstance) {
  fastify.delete<{ Params: { id: string }; Body: { fingerprint?: string } }>(
    '/users/:id',
    async (req, reply) => {
      if (req.user.role !== 'ADMIN')
        return reply.status(403).send({ error: 'Admin access required' })
      const body = z.object({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(req.body)
      if (!body.success) return reply.status(400).send({ error: 'A deletion preview is required.' })
      await adminTransaction((tx) =>
        executeUserDeletion(tx, req.params.id, req.user.id, body.data.fingerprint),
      )
      return reply.send({ message: 'User and their content deleted successfully.' })
    },
  )
}
