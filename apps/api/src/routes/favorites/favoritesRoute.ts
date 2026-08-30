import { FastifyInstance } from 'fastify'

import { prisma } from '../../lib/prisma.js'

type PaginationQuery = { page?: string; limit?: string }
type ToggleFavoriteBody = {
  pageId?: string
  projectId?: string
  sectionId?: string
}

export async function fetchFavorites(fastify: FastifyInstance) {
  fastify.get<{ Querystring: PaginationQuery }>('/favorites', async (req, reply) => {
    const { page = '1', limit = '20' } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)
    const where = { userId: req.user.id }

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        include: {
          page: { select: { id: true, title: true, slug: true } },
          project: { select: { id: true, name: true, slug: true } },
          section: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.favorite.count({ where }),
    ])

    return reply.status(200).send({ favorites, total, page: parseInt(page), limit: take })
  })
}

export async function toggleFavorite(fastify: FastifyInstance) {
  fastify.post<{ Body: ToggleFavoriteBody }>('/favorites', async (req, reply) => {
    const { pageId, projectId, sectionId } = req.body
    const userId = req.user.id

    const targets = [pageId, projectId, sectionId].filter(Boolean)
    if (targets.length !== 1) {
      return reply
        .status(400)
        .send({ error: 'Exactly one of pageId, projectId, or sectionId is required' })
    }

    let existing: { id: string } | null = null

    if (pageId) {
      existing = await prisma.favorite.findUnique({
        where: { userId_pageId: { userId, pageId } },
        select: { id: true },
      })
    } else if (projectId) {
      existing = await prisma.favorite.findUnique({
        where: { userId_projectId: { userId, projectId } },
        select: { id: true },
      })
    } else if (sectionId) {
      existing = await prisma.favorite.findUnique({
        where: { userId_sectionId: { userId, sectionId } },
        select: { id: true },
      })
    }

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } })
      return reply.status(200).send({ favorited: false })
    }

    await prisma.favorite.create({
      data: { userId, pageId, projectId, sectionId },
    })

    return reply.status(200).send({ favorited: true })
  })
}
