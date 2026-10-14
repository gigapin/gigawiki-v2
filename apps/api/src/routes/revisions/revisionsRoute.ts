import { FastifyInstance } from 'fastify'

import { savePage } from '../../lib/page-save.js'
import { prisma } from '../../lib/prisma.js'

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
      if (req.user?.role !== 'EDITOR' && req.user?.role !== 'ADMIN')
        return reply.status(403).send({ error: 'Editor or Admin role required' })

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
      if (req.user?.role !== 'EDITOR' && req.user?.role !== 'ADMIN')
        return reply.status(403).send({ error: 'Editor or Admin role required' })

      const { pageSlug, revisionNumber } = req.params
      if (!/^\d+$/.test(revisionNumber) || !Number.isSafeInteger(Number(revisionNumber)))
        return reply.status(400).send({ error: 'Invalid revision number' })

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
      if (req.user?.role !== 'EDITOR' && req.user?.role !== 'ADMIN')
        return reply.status(403).send({ error: 'Editor or Admin role required' })

      const { pageSlug, revisionNumber } = req.params
      if (!/^\d+$/.test(revisionNumber) || !Number.isSafeInteger(Number(revisionNumber)))
        return reply.status(400).send({ error: 'Invalid revision number' })

      return reply.send(await savePage(req, pageSlug, false, Number(revisionNumber)))
    },
  )
}
