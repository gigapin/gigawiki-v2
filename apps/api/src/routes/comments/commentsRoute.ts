import { FastifyInstance } from 'fastify'

import { adminTransaction } from '../../lib/admin-transaction.js'
import { recordActivity } from '../../lib/activity.js'
import { prisma } from '../../lib/prisma.js'

const COMMENT_SELECT = {
  id: true,
  body: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: { select: { id: true, name: true, slug: true, avatar: { select: { url: true } } } },
  replies: {
    where: { parentId: { not: null } },
    select: {
      id: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: { select: { id: true, name: true, slug: true, avatar: { select: { url: true } } } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
}

type CommentIdParams = { id: string }
type PageSlugParams = { pageSlug: string }
type ProjectSlugParams = { projectSlug: string }
type SectionSlugParams = { sectionSlug: string }
type PaginationQuery = { page?: string; limit?: string }

type CreateCommentBody = {
  body: string
  pageId?: string
  projectId?: string
  sectionId?: string
  parentId?: string
}

type UpdateCommentBody = { body: string }

export async function fetchPageComments(fastify: FastifyInstance) {
  fastify.get<{ Params: PageSlugParams; Querystring: PaginationQuery }>(
    '/pages/:pageSlug/comments',
    async (req, reply) => {
      const { pageSlug } = req.params
      const { page = '1', limit = '20' } = req.query

      const pageRecord = await prisma.page.findFirst({
        where: { slug: pageSlug, deletedAt: null },
        select: { id: true },
      })

      if (!pageRecord) {
        return reply.status(404).send({ error: 'Page not found' })
      }

      const skip = (parseInt(page) - 1) * parseInt(limit)
      const take = parseInt(limit)
      const where = { pageId: pageRecord.id, parentId: null }

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          select: COMMENT_SELECT,
          orderBy: { createdAt: 'asc' },
          skip,
          take,
        }),
        prisma.comment.count({ where }),
      ])

      return reply.status(200).send({ comments, total, page: parseInt(page), limit: take })
    },
  )
}

export async function fetchProjectComments(fastify: FastifyInstance) {
  fastify.get<{ Params: ProjectSlugParams; Querystring: PaginationQuery }>(
    '/projects/:projectSlug/comments',
    async (req, reply) => {
      const { projectSlug } = req.params
      const { page = '1', limit = '20' } = req.query

      const project = await prisma.project.findFirst({
        where: { slug: projectSlug, deletedAt: null },
        select: { id: true },
      })

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' })
      }

      const skip = (parseInt(page) - 1) * parseInt(limit)
      const take = parseInt(limit)
      const where = { projectId: project.id, parentId: null }

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          select: COMMENT_SELECT,
          orderBy: { createdAt: 'asc' },
          skip,
          take,
        }),
        prisma.comment.count({ where }),
      ])

      return reply.status(200).send({ comments, total, page: parseInt(page), limit: take })
    },
  )
}

export async function fetchSectionComments(fastify: FastifyInstance) {
  fastify.get<{ Params: SectionSlugParams; Querystring: PaginationQuery }>(
    '/sections/:sectionSlug/comments',
    async (req, reply) => {
      const { sectionSlug } = req.params
      const { page = '1', limit = '20' } = req.query

      const section = await prisma.section.findFirst({
        where: { slug: sectionSlug, deletedAt: null },
        select: { id: true },
      })

      if (!section) {
        return reply.status(404).send({ error: 'Section not found' })
      }

      const skip = (parseInt(page) - 1) * parseInt(limit)
      const take = parseInt(limit)
      const where = { sectionId: section.id, parentId: null }

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          select: COMMENT_SELECT,
          orderBy: { createdAt: 'asc' },
          skip,
          take,
        }),
        prisma.comment.count({ where }),
      ])

      return reply.status(200).send({ comments, total, page: parseInt(page), limit: take })
    },
  )
}

export async function createComment(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateCommentBody }>('/comments', async (req, reply) => {
    const { body, pageId, projectId, sectionId, parentId } = req.body

    if (typeof body !== 'string' || !body.trim())
      return reply.status(400).send({ error: 'Comment body is required' })

    const targets = [pageId, projectId, sectionId].filter(Boolean)
    if (targets.length !== 1) {
      return reply
        .status(400)
        .send({ error: 'Exactly one of pageId, projectId, or sectionId is required' })
    }

    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId },
        select: { pageId: true, projectId: true, sectionId: true, parentId: true },
      })

      if (!parent) {
        return reply.status(400).send({ error: 'Parent comment not found' })
      }

      if (parent.parentId)
        return reply.status(400).send({ error: 'Replies must belong to a root comment' })

      const sameTarget =
        (pageId && parent.pageId === pageId) ||
        (projectId && parent.projectId === projectId) ||
        (sectionId && parent.sectionId === sectionId)

      if (!sameTarget) {
        return reply.status(400).send({ error: 'Parent comment belongs to a different resource' })
      }
    }

    const comment = await adminTransaction(async (tx) => {
      const result = await tx.comment.create({
        data: {
          userId: req.user.id,
          body,
          pageId,
          projectId,
          sectionId,
          parentId,
        },
        select: {
          id: true,
          body: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          user: { select: { id: true, name: true, slug: true, avatar: { select: { url: true } } } },
        },
      })

      await recordActivity(
        tx,
        req,
        pageId ? 'PAGE' : projectId ? 'PROJECT' : 'SECTION',
        (pageId ?? projectId ?? sectionId)!,
        parentId ? 'REPLIED' : 'COMMENTED',
      )
      return result
    })

    return reply.status(201).send(comment)
  })
}

export async function updateComment(fastify: FastifyInstance) {
  fastify.patch<{ Params: CommentIdParams; Body: UpdateCommentBody }>(
    '/comments/:id',
    async (req, reply) => {
      const { id } = req.params
      if (typeof req.body.body !== 'string' || !req.body.body.trim())
        return reply.status(400).send({ error: 'Comment body is required' })

      const existing = await prisma.comment.findFirst({
        where: { id },
        select: { id: true, userId: true, pageId: true, projectId: true, sectionId: true },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Comment not found' })
      }

      if (existing.userId !== req.user.id) {
        return reply.status(403).send({ error: 'You can only edit your own comments' })
      }

      const comment = await adminTransaction(async (tx) => {
        const result = await tx.comment.update({
          where: { id },
          data: { body: req.body.body },
          select: {
            id: true,
            body: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            user: {
              select: { id: true, name: true, slug: true, avatar: { select: { url: true } } },
            },
          },
        })

        await recordActivity(
          tx,
          req,
          existing.pageId ? 'PAGE' : existing.projectId ? 'PROJECT' : 'SECTION',
          (existing.pageId ?? existing.projectId ?? existing.sectionId)!,
          'UPDATED',
          'Updated a comment',
        )
        return result
      })

      return reply.status(200).send(comment)
    },
  )
}

export async function deleteComment(fastify: FastifyInstance) {
  fastify.delete<{ Params: CommentIdParams }>('/comments/:id', async (req, reply) => {
    const { id } = req.params

    const existing = await prisma.comment.findFirst({
      where: { id },
      select: { id: true, userId: true, pageId: true, projectId: true, sectionId: true },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Comment not found' })
    }

    const isOwner = existing.userId === req.user.id
    const isAdmin = req.user.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    await adminTransaction(async (tx) => {
      await tx.comment.delete({ where: { id } })
      await recordActivity(
        tx,
        req,
        existing.pageId ? 'PAGE' : existing.projectId ? 'PROJECT' : 'SECTION',
        (existing.pageId ?? existing.projectId ?? existing.sectionId)!,
        'DELETED',
        'Deleted a comment',
      )
    })

    return reply.status(200).send({ message: 'Comment deleted successfully' })
  })
}
