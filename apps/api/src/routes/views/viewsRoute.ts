import { FastifyInstance } from 'fastify'

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
