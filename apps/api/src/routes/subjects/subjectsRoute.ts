import { z } from 'zod'
import { FastifyInstance } from 'fastify'

import { generateUniqueSlug } from '../../lib/slugify.js'
import { prisma } from '../../lib/prisma.js'

const SUBJECT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  color: true,
  icon: true,
  visibility: true,
  imageId: true,
  image: { select: { id: true, url: true } },
  userId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
}

type SubjectSlugParams = { slug: string }

type FetchSubjectsQuery = {
  visibility?: 'PUBLIC' | 'PRIVATE'
  page?: string
  limit?: string
}

type CreateSubjectBody = {
  name: string
  description?: string
  color?: string
  icon?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
  imageId?: string | null
}

type PatchSubjectBody = {
  name?: string
  description?: string
  color?: string
  icon?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
  imageId?: string | null
}

export async function fetchAllSubjects(fastify: FastifyInstance) {
  fastify.get<{ Querystring: FetchSubjectsQuery }>('/subjects', async (req, reply) => {
    const { visibility, page = '1', limit = '20' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where: Record<string, unknown> = { deletedAt: null }
    if (visibility) where.visibility = visibility

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        select: {
          ...SUBJECT_SELECT,
          _count: { select: { projects: { where: { deletedAt: null } } } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subject.count({ where }),
    ])

    return reply.status(200).send({ subjects, total, page: parseInt(page), limit: take })
  })
}

export async function fetchSubject(fastify: FastifyInstance) {
  fastify.get<{ Params: SubjectSlugParams }>('/subjects/:slug', async (req, reply) => {
    const { slug } = req.params

    const subject = await prisma.subject.findFirst({
      where: { slug, deletedAt: null },
      select: {
        ...SUBJECT_SELECT,
        user: { select: { id: true, name: true } },
        _count: { select: { projects: { where: { deletedAt: null } } } },
      },
    })

    if (!subject) {
      return reply.status(404).send({ error: 'Subject not found' })
    }

    return reply.status(200).send(subject)
  })
}

export async function createSubject(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateSubjectBody }>('/subjects', async (req, reply) => {
    if (req.user.role === 'GUEST') {
      return reply.status(403).send({ error: 'Editor or Admin role required' })
    }

    const parsed = z
      .object({
        name: z.string().trim().min(1).max(100),
        description: z.string().optional(),
        visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
        imageId: z.string().min(1).nullable().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid subject fields' })
    const { name, description, color, icon, visibility, imageId } = parsed.data

    const checkDuplicateSubjectName = await prisma.subject.findFirst({
      where: { name },
    })

    if (checkDuplicateSubjectName) {
      return reply.status(409).send({ error: 'Name already used' })
    }

    const slug = await generateUniqueSlug(name, async (candidate) =>
      Boolean(
        await prisma.subject.findUnique({ where: { slug: candidate }, select: { id: true } }),
      ),
    )

    const subject = await prisma.subject.create({
      data: { userId: req.user.id, name, slug, description, color, icon, visibility, imageId },
      select: SUBJECT_SELECT,
    })

    return reply.status(201).send(subject)
  })
}

export async function updateSubject(fastify: FastifyInstance) {
  fastify.patch<{ Params: SubjectSlugParams; Body: PatchSubjectBody }>(
    '/subjects/:slug',
    async (req, reply) => {
      const { slug } = req.params
      const parsed = z
        .object({
          name: z.string().trim().min(1).max(100).optional(),
          description: z.string().optional(),
          visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
          imageId: z.string().min(1).nullable().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
        })
        .safeParse(req.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid subject fields' })
      const { name, description, color, icon, visibility, imageId } = parsed.data

      const existing = await prisma.subject.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true, userId: true, name: true },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Subject not found' })
      }

      const isAdmin = req.user.role === 'ADMIN'
      const isOwner = existing.userId === req.user.id

      if (!isAdmin && !isOwner) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      const data: Record<string, unknown> = {}
      if (name !== undefined) {
        data.name = name
        if (name !== existing.name)
          data.slug = await generateUniqueSlug(name, async (candidate) => {
            const match = await prisma.subject.findUnique({
              where: { slug: candidate },
              select: { id: true },
            })
            return Boolean(match && match.id !== existing.id)
          })
      }
      if (description !== undefined) data.description = description
      if (color !== undefined) data.color = color
      if (icon !== undefined) data.icon = icon
      if (visibility !== undefined) data.visibility = visibility
      if (imageId !== undefined) data.imageId = imageId

      const subject = await prisma.subject.update({
        where: { id: existing.id },
        data,
        select: SUBJECT_SELECT,
      })

      return reply.status(200).send(subject)
    },
  )
}

export async function deleteSubject(fastify: FastifyInstance) {
  fastify.delete<{ Params: SubjectSlugParams }>('/subjects/:slug', async (req, reply) => {
    if (req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const existing = await prisma.subject.findFirst({
      where: { slug: req.params.slug, deletedAt: null },
      select: { id: true },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Subject not found' })
    }

    await prisma.subject.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    return reply.status(200).send({ message: 'Subject deleted successfully' })
  })
}
