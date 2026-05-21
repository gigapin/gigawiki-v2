import { FastifyInstance } from 'fastify'
import slugify from 'slugify'

import { prisma } from '../../lib/prisma.js'

const SUBJECT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  visibility: true,
  imageId: true,
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
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type PatchSubjectBody = {
  name?: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
  imageId?: string
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
        select: { ...SUBJECT_SELECT, _count: { select: { projects: true } } },
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
        projects: {
          where: { deletedAt: null },
          include: { _count: { select: { sections: true } } },
        },
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

    const { name, description, visibility } = req.body
    const slug = slugify(name, { lower: true, strict: true })

    const subject = await prisma.subject.create({
      data: { userId: req.user.id, name, slug, description, visibility },
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
      const { name, description, visibility, imageId } = req.body

      const existing = await prisma.subject.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true, userId: true },
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
        data.slug = slugify(name, { lower: true, strict: true })
      }
      if (description !== undefined) data.description = description
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
