import { FastifyInstance } from 'fastify'

import { prisma } from '../../lib/prisma.js'

type TagIdParams = { id: string }
type TagQuery = { name?: string }
type CreateTagBody = {
  name: string
  pageId?: string
  projectId?: string
  sectionId?: string
}

export async function fetchTags(fastify: FastifyInstance) {
  fastify.get<{ Querystring: TagQuery }>('/tags', async (req, reply) => {
    const { name } = req.query

    if (!name) {
      return reply.status(200).send([])
    }

    const tags = await prisma.tag.findMany({
      where: { name: { startsWith: name.toLowerCase() } },
      select: { id: true, name: true },
      take: 20,
    })

    return reply.status(200).send(tags)
  })
}

export async function createTag(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateTagBody }>('/tags', async (req, reply) => {
    if (req.user.role === 'GUEST') {
      return reply.status(403).send({ error: 'Editor or Admin role required' })
    }

    const { name, pageId, projectId, sectionId } = req.body

    const targets = [pageId, projectId, sectionId].filter(Boolean)
    if (targets.length !== 1) {
      return reply
        .status(400)
        .send({ error: 'Exactly one of pageId, projectId, or sectionId is required' })
    }

    const normalizedName = name.toLowerCase()

    const where = pageId ? { pageId } : projectId ? { projectId } : { sectionId }
    const count = await prisma.tag.count({ where })

    if (count >= 10) {
      return reply.status(400).send({ error: 'Maximum 10 tags per resource' })
    }

    const tag = await prisma.tag.create({
      data: {
        userId: req.user.id,
        name: normalizedName,
        pageId,
        projectId,
        sectionId,
      },
      select: { id: true, name: true, createdAt: true },
    })

    return reply.status(201).send(tag)
  })
}

export async function deleteTag(fastify: FastifyInstance) {
  fastify.delete<{ Params: TagIdParams }>('/tags/:id', async (req, reply) => {
    const { id } = req.params

    const tag = await prisma.tag.findFirst({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!tag) {
      return reply.status(404).send({ error: 'Tag not found' })
    }

    const isOwner = tag.userId === req.user.id
    const isAdmin = req.user.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    await prisma.tag.delete({ where: { id } })

    return reply.status(200).send({ message: 'Tag deleted successfully' })
  })
}
