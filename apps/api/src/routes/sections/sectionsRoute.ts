import { FastifyInstance } from 'fastify'

import { generateSlug, generateUniqueSlug } from '../../lib/slugify.js'
import { prisma } from '../../lib/prisma.js'

const SECTION_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  position: true,
  visibility: true,
  projectId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
}

type SectionSlugParams = { slug: string }
type ProjectSectionsParams = { projectSlug: string }

type CreateSectionBody = {
  projectId: string
  title: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type PatchSectionBody = {
  title?: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type ReorderBody = {
  positions: { id: string; position: number }[]
}

export async function fetchSectionsByProject(fastify: FastifyInstance) {
  fastify.get<{ Params: ProjectSectionsParams }>(
    '/projects/:projectSlug/sections',
    async (req, reply) => {
      const { projectSlug } = req.params

      const project = await prisma.project.findFirst({
        where: { slug: projectSlug, deletedAt: null },
        select: { id: true },
      })

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' })
      }

      const sections = await prisma.section.findMany({
        where: { projectId: project.id, deletedAt: null },
        include: { _count: { select: { pages: true } } },
        orderBy: { position: 'asc' },
      })

      return reply.status(200).send({ sections })
    },
  )
}

export async function fetchSection(fastify: FastifyInstance) {
  fastify.get<{ Params: SectionSlugParams }>('/sections/:slug', async (req, reply) => {
    const { slug } = req.params

    const section = await prisma.section.findFirst({
      where: { slug, deletedAt: null },
      select: {
        ...SECTION_SELECT,
        pages: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          select: { title: true, slug: true, isDraft: true },
        },
      },
    })

    if (!section) {
      return reply.status(404).send({ error: 'Section not found' })
    }

    return reply.status(200).send(section)
  })
}

export async function createSection(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateSectionBody }>('/sections', async (req, reply) => {
    if (req.user.role === 'GUEST') {
      return reply.status(403).send({ error: 'Editor or Admin role required' })
    }

    const { projectId, title, description, visibility } = req.body

    const slug = await generateUniqueSlug(title, async (candidate) =>
      Boolean(
        await prisma.section.findUnique({ where: { slug: candidate }, select: { id: true } }),
      ),
    )

    const aggregate = await prisma.section.aggregate({
      where: { projectId },
      _max: { position: true },
    })
    const position = (aggregate._max.position ?? -1) + 1

    const section = await prisma.section.create({
      data: { projectId, title, slug, description, visibility, position },
      select: SECTION_SELECT,
    })

    return reply.status(201).send(section)
  })
}

export async function updateSection(fastify: FastifyInstance) {
  fastify.patch<{ Params: SectionSlugParams; Body: PatchSectionBody }>(
    '/sections/:slug',
    async (req, reply) => {
      const { slug } = req.params
      const { title, description, visibility } = req.body

      const existing = await prisma.section.findFirst({
        where: { slug, deletedAt: null },
        select: {
          id: true,
          project: { select: { userId: true } },
        },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Section not found' })
      }

      const isAdmin = req.user.role === 'ADMIN'
      const isOwner = existing.project.userId === req.user.id

      if (!isAdmin && !isOwner) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      const data: Record<string, unknown> = {}
      if (title !== undefined) {
        data.title = title
        data.slug = generateSlug(title)
      }
      if (description !== undefined) data.description = description
      if (visibility !== undefined) data.visibility = visibility

      const section = await prisma.section.update({
        where: { id: existing.id },
        data,
        select: SECTION_SELECT,
      })

      return reply.status(200).send(section)
    },
  )
}

export async function reorderSections(fastify: FastifyInstance) {
  fastify.patch<{ Params: SectionSlugParams; Body: ReorderBody }>(
    '/sections/:slug/position',
    async (req, reply) => {
      if (req.user.role === 'GUEST') {
        return reply.status(403).send({ error: 'Editor or Admin role required' })
      }

      const { positions } = req.body

      await prisma.$transaction(
        positions.map(({ id, position }) =>
          prisma.section.update({ where: { id }, data: { position } }),
        ),
      )

      return reply.status(200).send({ message: 'Positions updated' })
    },
  )
}

export async function deleteSection(fastify: FastifyInstance) {
  fastify.delete<{ Params: SectionSlugParams }>('/sections/:slug', async (req, reply) => {
    if (req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const existing = await prisma.section.findFirst({
      where: { slug: req.params.slug, deletedAt: null },
      select: { id: true },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Section not found' })
    }

    await prisma.section.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    return reply.status(200).send({ message: 'Section deleted successfully' })
  })
}
