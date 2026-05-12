import { FastifyInstance } from 'fastify'
import slugify from 'slugify'

import { prisma } from '../../lib/prisma.js'

type CreateSectionBody = {
  projectId: string
  title: string
  description?: string
  position?: number
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type UpdateSectionBody = {
  title?: string
  description?: string
  position?: number
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type SectionParams = {
  id: string
}

export function createSection(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateSectionBody }>('/sections/create', async (req, reply) => {
    const { projectId, title, description, position, visibility } = req.body

    const slug = slugify(title, { lower: true, strict: true })

    try {
      const section = await prisma.section.create({
        data: { projectId, title, slug, description, position, visibility },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          position: true,
          visibility: true,
          projectId: true,
          createdAt: true,
        },
      })

      return reply.status(201).send(section)
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        return reply.status(409).send({ error: 'Section slug already in use' })
      }
      throw error
    }
  })
}

export function fetchSection(fastify: FastifyInstance) {
  fastify.get<{ Params: SectionParams }>('/sections/:id', async (req, reply) => {
    const { id } = req.params

    try {
      const section = await prisma.section.findUnique({
        where: { id, deletedAt: null },
      })

      if (!section) {
        return reply.status(404).send({ error: 'Section not found' })
      }

      return reply.send(section)
    } catch (error) {
      req.log.error({ error }, 'fetchSection error')
      return reply.status(404).send({ error: 'Section not found' })
    }
  })
}

export function fetchAllSections(fastify: FastifyInstance) {
  fastify.get('/sections', async (req, reply) => {
    try {
      const sections = await prisma.section.findMany({
        where: { deletedAt: null },
      })

      return reply.status(200).send({ sections, message: 'All sections fetched' })
    } catch (error) {
      req.log.error({ error }, 'fetchAllSections error')
      return reply.status(500).send({ message: 'Something went wrong' })
    }
  })
}

export function updateSection(fastify: FastifyInstance) {
  fastify.put<{ Params: SectionParams; Body: UpdateSectionBody }>(
    '/sections/:id/edit',
    async (req, reply) => {
      const { id } = req.params
      const { title, description, position, visibility } = req.body

      const data: UpdateSectionBody & { slug?: string } = { description, position, visibility }
      if (title) {
        data.title = title
        data.slug = slugify(title, { lower: true, strict: true })
      }

      try {
        const section = await prisma.section.update({
          where: { id },
          data,
        })

        return reply.status(200).send({ data: section, message: 'Section updated successfully' })
      } catch (error) {
        req.log.error({ error }, 'updateSection error')
        return reply.status(500).send({ message: 'An internal server error occurred' })
      }
    },
  )
}

export function deleteSection(fastify: FastifyInstance) {
  fastify.delete<{ Params: SectionParams }>('/sections/:id/delete', async (req, reply) => {
    const { id } = req.params

    try {
      await prisma.section.delete({ where: { id } })

      return reply.status(200).send({ message: 'Section deleted successfully' })
    } catch (error) {
      req.log.error({ error }, 'deleteSection error')
      return reply.status(500).send({ message: 'An error occurred during section deletion' })
    }
  })
}
