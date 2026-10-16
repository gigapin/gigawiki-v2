import { FastifyInstance } from 'fastify'
import { sanitizeContent } from 'wiki-content/server'

import { generateUniqueSlug } from '../../lib/slugify.js'
import { prisma } from '../../lib/prisma.js'
import { adminTransaction } from '../../lib/admin-transaction.js'
import { recordActivity, auditedWrite } from '../../lib/activity.js'

const SECTION_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  descriptionFormat: true,
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
  descriptionFormat?: 'text' | 'html'
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type PatchSectionBody = {
  title?: string
  descriptionFormat?: 'text' | 'html'
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
        include: {
          tags: true,
          favorites: { where: { userId: req.user?.id ?? '' }, select: { id: true } },
          _count: { select: { pages: { where: { deletedAt: null } } } },
        },
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

    const { projectId, title, description, descriptionFormat, visibility } = req.body

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

    const section = await auditedWrite(req, 'SECTION', 'CREATED', (tx) =>
      tx.section.create({
        data: {
          projectId,
          title,
          slug,
          description:
            descriptionFormat === 'html' ? sanitizeContent(description ?? '') : description,
          descriptionFormat,
          visibility,
          position,
        },
        select: SECTION_SELECT,
      }),
    )

    return reply.status(201).send(section)
  })
}

export async function updateSection(fastify: FastifyInstance) {
  fastify.patch<{ Params: SectionSlugParams; Body: PatchSectionBody }>(
    '/sections/:slug',
    async (req, reply) => {
      const { slug } = req.params
      const { title, description, descriptionFormat, visibility } = req.body

      const existing = await prisma.section.findFirst({
        where: { slug, deletedAt: null },
        select: {
          id: true,
          description: true,
          descriptionFormat: true,
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
        data.slug = await generateUniqueSlug(title, async (candidate) => {
          const match = await prisma.section.findUnique({
            where: { slug: candidate },
            select: { id: true },
          })
          return Boolean(match && match.id !== existing.id)
        })
      }
      if (descriptionFormat !== undefined) {
        data.descriptionFormat = descriptionFormat
        if (descriptionFormat === 'html' && description === undefined)
          data.description = sanitizeContent(existing.description ?? '')
      }
      if (description !== undefined) {
        const format = descriptionFormat ?? existing.descriptionFormat
        data.description = format === 'html' ? sanitizeContent(description) : description
      }
      if (visibility !== undefined) data.visibility = visibility

      const section = await auditedWrite(req, 'SECTION', 'UPDATED', (tx) =>
        tx.section.update({
          where: { id: existing.id },
          data,
          select: SECTION_SELECT,
        }),
      )

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

      if (
        !Array.isArray(positions) ||
        !positions.length ||
        positions.some(
          (item) => !item.id || !Number.isSafeInteger(item.position) || item.position < 0,
        ) ||
        new Set(positions.map((item) => item.id)).size !== positions.length
      )
        return reply.status(400).send({ error: 'Invalid positions' })
      const target = await prisma.section.findFirst({
        where: { slug: req.params.slug, deletedAt: null },
        include: { project: true },
      })
      if (!target) return reply.status(404).send({ error: 'Section not found' })
      if (req.user.role !== 'ADMIN' && target.project.userId !== req.user.id)
        return reply.status(403).send({ error: 'Forbidden' })
      const found = await prisma.section.count({
        where: {
          id: { in: positions.map((item) => item.id) },
          projectId: target.projectId,
          deletedAt: null,
        },
      })
      if (found !== positions.length)
        return reply
          .status(400)
          .send({ error: 'Sections must belong to the same accessible project' })
      await adminTransaction(async (tx) => {
        for (const { id, position } of positions) {
          await tx.section.update({ where: { id }, data: { position } })
          await recordActivity(tx, req, 'SECTION', id, 'UPDATED', 'Changed section order')
        }
      })

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

    await auditedWrite(req, 'SECTION', 'DELETED', (tx) =>
      tx.section.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      }),
    )

    return reply.status(200).send({ message: 'Section deleted successfully' })
  })
}
