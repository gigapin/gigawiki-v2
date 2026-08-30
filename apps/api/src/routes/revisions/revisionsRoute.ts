import { FastifyInstance } from 'fastify'

import { generateSlug } from '../../lib/slugify.js'
import { prisma } from '../../lib/prisma.js'

const PAGE_INDEX_SELECT = {
  id: true,
  title: true,
  slug: true,
  position: true,
  visibility: true,
  isDraft: true,
  restricted: true,
  currentRevision: true,
  sectionId: true,
  projectId: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, slug: true } },
}

const REVISION_LIST_SELECT = {
  id: true,
  revisionNumber: true,
  title: true,
  summary: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
}

type RevisionParams = { pageSlug: string; revisionNumber: string }
type PageSlugParams = { pageSlug: string }
type PaginationQuery = { page?: string; limit?: string }

export async function fetchRevisions(fastify: FastifyInstance) {
  fastify.get<{ Params: PageSlugParams; Querystring: PaginationQuery }>(
    '/pages/:pageSlug/revisions',
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

      const [revisions, total] = await Promise.all([
        prisma.revision.findMany({
          where: { pageId: pageRecord.id },
          select: REVISION_LIST_SELECT,
          orderBy: { revisionNumber: 'desc' },
          skip,
          take,
        }),
        prisma.revision.count({ where: { pageId: pageRecord.id } }),
      ])

      return reply.status(200).send({ revisions, total, page: parseInt(page), limit: take })
    },
  )
}

export async function fetchRevision(fastify: FastifyInstance) {
  fastify.get<{ Params: RevisionParams }>(
    '/pages/:pageSlug/revisions/:revisionNumber',
    async (req, reply) => {
      const { pageSlug, revisionNumber } = req.params

      const pageRecord = await prisma.page.findFirst({
        where: { slug: pageSlug, deletedAt: null },
        select: { id: true },
      })

      if (!pageRecord) {
        return reply.status(404).send({ error: 'Page not found' })
      }

      const revision = await prisma.revision.findFirst({
        where: { pageId: pageRecord.id, revisionNumber: parseInt(revisionNumber) },
        include: { createdBy: { select: { id: true, name: true } } },
      })

      if (!revision) {
        return reply.status(404).send({ error: 'Revision not found' })
      }

      return reply.status(200).send(revision)
    },
  )
}

export async function restoreRevision(fastify: FastifyInstance) {
  fastify.post<{ Params: RevisionParams }>(
    '/pages/:pageSlug/revisions/:revisionNumber/restore',
    async (req, reply) => {
      if (req.user.role === 'GUEST') {
        return reply.status(403).send({ error: 'Editor or Admin role required' })
      }

      const { pageSlug, revisionNumber } = req.params

      const pageRecord = await prisma.page.findFirst({
        where: { slug: pageSlug, deletedAt: null },
      })

      if (!pageRecord) {
        return reply.status(404).send({ error: 'Page not found' })
      }

      const revision = await prisma.revision.findFirst({
        where: { pageId: pageRecord.id, revisionNumber: parseInt(revisionNumber) },
      })

      if (!revision) {
        return reply.status(404).send({ error: 'Revision not found' })
      }

      await prisma.revision.create({
        data: {
          pageId: pageRecord.id,
          projectId: pageRecord.projectId,
          sectionId: pageRecord.sectionId,
          createdById: req.user.id,
          title: pageRecord.title,
          content: pageRecord.content,
          slug: pageRecord.slug,
          revisionNumber: pageRecord.currentRevision,
        },
      })

      const newSlug =
        revision.title !== pageRecord.title ? generateSlug(revision.title) : pageRecord.slug

      const updated = await prisma.page.update({
        where: { id: pageRecord.id },
        data: {
          title: revision.title,
          content: revision.content,
          slug: newSlug,
          updatedById: req.user.id,
          currentRevision: pageRecord.currentRevision + 1,
        },
        select: PAGE_INDEX_SELECT,
      })

      return reply.status(200).send(updated)
    },
  )
}
