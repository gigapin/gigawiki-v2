import { FastifyInstance } from 'fastify'

import { generateUniqueSlug } from '../../lib/slugify.js'
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

      const updated = await prisma
        .$transaction(async (transaction) => {
          const newSlug =
            revision.title !== pageRecord.title
              ? await generateUniqueSlug(revision.title, async (candidate) => {
                  const match = await transaction.page.findUnique({
                    where: { slug: candidate },
                    select: { id: true },
                  })
                  return Boolean(match && match.id !== pageRecord.id)
                })
              : pageRecord.slug

          await transaction.revision.create({
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

          return transaction.page.update({
            // If another edit won the race, the transaction rolls back its snapshot.
            where: {
              id: pageRecord.id,
              currentRevision: pageRecord.currentRevision,
              deletedAt: null,
            },
            data: {
              title: revision.title,
              content: revision.content,
              slug: newSlug,
              updatedById: req.user.id,
              currentRevision: pageRecord.currentRevision + 1,
            },
            select: PAGE_INDEX_SELECT,
          })
        })
        .catch((error: unknown) => {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
            reply
              .status(409)
              .send({ error: 'The page changed while restoring. Reload the page and try again.' })
            return null
          }
          throw error
        })
      if (!updated) return

      return reply.status(200).send(updated)
    },
  )
}
