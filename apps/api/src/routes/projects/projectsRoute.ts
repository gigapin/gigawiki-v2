import { FastifyInstance } from 'fastify'
import slugify from 'slugify'

import { prisma } from '../../lib/prisma.js'

const PROJECT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  visibility: true,
  imageId: true,
  userId: true,
  subjectId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
}

type ProjectSlugParams = { slug: string }
type SubjectProjectsParams = { subjectSlug: string }
type SubjectProjectsQuery = { page?: string; limit?: string }
type ActivityQuery = { page?: string; limit?: string }

type CreateProjectBody = {
  name: string
  subjectId: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type PatchProjectBody = {
  name?: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
  imageId?: string
}

export async function fetchProjectsBySubject(fastify: FastifyInstance) {
  fastify.get<{ Params: SubjectProjectsParams; Querystring: SubjectProjectsQuery }>(
    '/subjects/:subjectSlug/projects',
    async (req, reply) => {
      const { subjectSlug } = req.params
      const { page = '1', limit = '20' } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)
      const take = parseInt(limit)

      const subject = await prisma.subject.findFirst({
        where: { slug: subjectSlug, deletedAt: null },
        select: { id: true },
      })

      if (!subject) {
        return reply.status(404).send({ error: 'Subject not found' })
      }

      const where = { subjectId: subject.id, deletedAt: null }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            tags: true,
            _count: { select: { sections: true, pages: true, views: true } },
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.project.count({ where }),
      ])

      return reply.status(200).send({ projects, total, page: parseInt(page), limit: take })
    },
  )
}

export async function fetchProject(fastify: FastifyInstance) {
  fastify.get<{ Params: ProjectSlugParams }>('/projects/:slug', async (req, reply) => {
    const { slug } = req.params

    const project = await prisma.project.findFirst({
      where: { slug, deletedAt: null },
      include: {
        sections: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
        tags: true,
        _count: { select: { favorites: true } },
      },
    })

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' })
    }

    // Fire-and-forget View upsert for authenticated requests
    try {
      await req.jwtVerify()
      void prisma.view
        .upsert({
          where: { userId_projectId: { userId: req.user.id, projectId: project.id } },
          update: { count: { increment: 1 }, lastSeenAt: new Date() },
          create: { userId: req.user.id, projectId: project.id },
        })
        .catch(() => {})
    } catch {
      // unauthenticated — skip view tracking
    }

    return reply.status(200).send(project)
  })
}

export async function createProject(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateProjectBody }>('/projects', async (req, reply) => {
    if (req.user.role === 'GUEST') {
      return reply.status(403).send({ error: 'Editor or Admin role required' })
    }

    const { name, subjectId, description, visibility } = req.body
    const slug = slugify(name, { lower: true, strict: true })

    const project = await prisma.project.create({
      data: { userId: req.user.id, subjectId, name, slug, description, visibility },
      select: PROJECT_SELECT,
    })

    return reply.status(201).send(project)
  })
}

export async function updateProject(fastify: FastifyInstance) {
  fastify.patch<{ Params: ProjectSlugParams; Body: PatchProjectBody }>(
    '/projects/:slug',
    async (req, reply) => {
      const { slug } = req.params
      const { name, description, visibility, imageId } = req.body

      const existing = await prisma.project.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true, userId: true },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Project not found' })
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

      const project = await prisma.project.update({
        where: { id: existing.id },
        data,
        select: PROJECT_SELECT,
      })

      return reply.status(200).send(project)
    },
  )
}

export async function deleteProject(fastify: FastifyInstance) {
  fastify.delete<{ Params: ProjectSlugParams }>('/projects/:slug', async (req, reply) => {
    if (req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const existing = await prisma.project.findFirst({
      where: { slug: req.params.slug, deletedAt: null },
      select: { id: true },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' })
    }

    await prisma.project.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    return reply.status(200).send({ message: 'Project deleted successfully' })
  })
}

export async function fetchProjectActivity(fastify: FastifyInstance) {
  fastify.get<{ Params: ProjectSlugParams; Querystring: ActivityQuery }>(
    '/projects/:slug/activity',
    async (req, reply) => {
      const { slug } = req.params
      const { page = '1', limit = '20' } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)
      const take = parseInt(limit)

      const project = await prisma.project.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true },
      })

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' })
      }

      const [sectionIds, pageIds] = await Promise.all([
        prisma.section
          .findMany({ where: { projectId: project.id }, select: { id: true } })
          .then((rows) => rows.map((r) => r.id)),
        prisma.page
          .findMany({ where: { projectId: project.id }, select: { id: true } })
          .then((rows) => rows.map((r) => r.id)),
      ])

      const where = {
        OR: [
          { projectId: project.id },
          ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
          ...(pageIds.length ? [{ pageId: { in: pageIds } }] : []),
        ],
      }

      const [activities, total] = await Promise.all([
        prisma.activity.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.activity.count({ where }),
      ])

      return reply.status(200).send({ activities, total, page: parseInt(page), limit: take })
    },
  )
}
