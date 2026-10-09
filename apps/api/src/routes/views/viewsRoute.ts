import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { prisma } from '../../lib/prisma.js'

type PageSlugParams = { pageSlug: string }

export async function fetchPageViews(fastify: FastifyInstance) {
  fastify.get<{ Params: PageSlugParams }>('/pages/:pageSlug/views', async (req, reply) => {
    const { pageSlug } = req.params

    const pageRecord = await prisma.page.findFirst({
      where: { slug: pageSlug, deletedAt: null },
      select: { id: true },
    })

    if (!pageRecord) {
      return reply.status(404).send({ error: 'Page not found' })
    }

    const result = await prisma.view.aggregate({
      where: { pageId: pageRecord.id },
      _sum: { count: true },
      _count: { userId: true },
    })

    return reply.status(200).send({
      totalViews: result._sum.count ?? 0,
      uniqueViewers: result._count.userId,
    })
  })
}

export async function fetchRecentViews(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: string; limit?: string; userId?: string } }>(
    '/views',
    async (req, reply) => {
      if (!req.user?.id) return reply.status(401).send({ error: 'Authentication required' })
      const parsed = z
        .object({
          page: z.coerce.number().int().min(1).max(1000000).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        })
        .safeParse(req.query)
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid pagination' })
      const { page, limit } = parsed.data
      // History is personal; userId in the query cannot select another account.
      const where = {
        userId: req.user.id,
        OR: [
          {
            page: {
              is: {
                deletedAt: null,
                section: { deletedAt: null },
                project: { deletedAt: null, subject: { deletedAt: null } },
              },
            },
          },
          { project: { is: { deletedAt: null, subject: { deletedAt: null } } } },
          {
            section: {
              is: { deletedAt: null, project: { deletedAt: null, subject: { deletedAt: null } } },
            },
          },
        ],
      }
      const [views, total] = await Promise.all([
        prisma.view.findMany({
          where,
          select: {
            id: true,
            count: true,
            lastSeenAt: true,
            page: { select: { id: true, title: true, slug: true } },
            project: { select: { id: true, name: true, slug: true } },
            section: {
              select: { id: true, title: true, slug: true, project: { select: { slug: true } } },
            },
          },
          orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.view.count({ where }),
      ])
      return reply.status(200).send({ views, total, page, limit })
    },
  )
}
