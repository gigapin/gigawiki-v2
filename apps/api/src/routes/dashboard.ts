import type { FastifyInstance } from 'fastify'

import { prisma } from '../lib/prisma.js'

export async function dashboardStats(app: FastifyInstance) {
  app.get('/dashboard/stats', async (request, reply) => {
    if (request.user.role !== 'ADMIN')
      return reply.code(403).send({ error: 'Admin access required' })
    const [users, pages, subjects] = await Promise.all([
      prisma.user.count(),
      prisma.page.count({ where: { deletedAt: null } }),
      prisma.subject.count({ where: { deletedAt: null } }),
    ])
    return { users, pages, subjects }
  })
}
