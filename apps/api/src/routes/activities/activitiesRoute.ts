import { FastifyInstance } from 'fastify'
import { ActivityType, ResourceType } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'

type PaginationQuery = { page?: string; limit?: string }
type ActivitiesQuery = PaginationQuery & {
  userId?: string
  resourceType?: string
  type?: string
  from?: string
  to?: string
}
type UserIdParams = { id: string }

export async function fetchActivities(fastify: FastifyInstance) {
  fastify.get<{ Querystring: ActivitiesQuery }>('/activities', async (req, reply) => {
    if (req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin role required' })
    }

    const { page = '1', limit = '20', userId, resourceType, type, from, to } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId
    if (resourceType) where.resourceType = resourceType
    if (type) where.type = type

    const fromDate = from ? new Date(from) : null
    const toDate = to ? new Date(to) : null
    if (fromDate && !isNaN(fromDate.getTime())) {
      where.createdAt = { ...(where.createdAt as object), gte: fromDate }
    }
    if (toDate && !isNaN(toDate.getTime())) {
      where.createdAt = { ...(where.createdAt as object), lte: toDate }
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          page: { select: { title: true } },
          project: { select: { name: true } },
          section: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.activity.count({ where }),
    ])

    return reply.status(200).send({ activities, total, page: parseInt(page), limit: take })
  })
}

export async function fetchUserActivities(fastify: FastifyInstance) {
  fastify.get<{ Params: UserIdParams; Querystring: PaginationQuery }>(
    '/users/:id/activities',
    async (req, reply) => {
      const { id } = req.params
      const targetId = id === 'me' ? req.user.id : id

      const isOwn = targetId === req.user.id
      const isAdmin = req.user.role === 'ADMIN'

      if (!isOwn && !isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      const { page = '1', limit = '20' } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)
      const take = parseInt(limit)
      const where = { userId: targetId }

      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          include: {
            page: { select: { title: true } },
            project: { select: { name: true } },
            section: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.activity.count({ where }),
      ])

      return reply.status(200).send({ activities, total, page: parseInt(page), limit: take })
    },
  )
}

export async function logActivity(
  userId: string,
  type: ActivityType,
  resourceType: ResourceType,
  data: { pageId?: string; projectId?: string; sectionId?: string },
  details?: string,
  ip?: string,
): Promise<void> {
  await prisma.activity.create({
    data: { userId, type, resourceType, details, ip, ...data },
  })
}
