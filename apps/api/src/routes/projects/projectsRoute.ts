import { FastifyInstance } from 'fastify'
import slugify from 'slugify'

import { prisma } from '../../lib/prisma.js'

type CreateProjectBody = {
  userId: string
  subjectId: string
  name: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type UpdateProjectBody = {
  name?: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type ProjectParams = {
  id: string
}

export function createProject(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateProjectBody }>('/projects/create', async (req, reply) => {
    const { userId, subjectId, name, description, visibility } = req.body

    const slug = slugify(name, { lower: true, strict: true })

    try {
      const project = await prisma.project.create({
        data: { userId, subjectId, name, slug, description, visibility },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          visibility: true,
          userId: true,
          subjectId: true,
          createdAt: true,
        },
      })

      return reply.status(201).send(project)
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        return reply.status(409).send({ error: 'Project name already in use' })
      }
      throw error
    }
  })
}

export function fetchProject(fastify: FastifyInstance) {
  fastify.get<{ Params: ProjectParams }>('/projects/:id', async (req, reply) => {
    const { id } = req.params

    try {
      const project = await prisma.project.findUnique({
        where: { id, deletedAt: null },
      })

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' })
      }

      return reply.send(project)
    } catch (error) {
      req.log.error({ error }, 'fetchProject error')
      return reply.status(404).send({ error: 'Project not found' })
    }
  })
}

export function fetchAllProjects(fastify: FastifyInstance) {
  fastify.get('/projects', async (req, reply) => {
    try {
      const projects = await prisma.project.findMany({
        where: { deletedAt: null },
      })

      return reply.status(200).send({ projects, message: 'All projects fetched' })
    } catch (error) {
      req.log.error({ error }, 'fetchAllProjects error')
      return reply.status(500).send({ message: 'Something went wrong' })
    }
  })
}

export function updateProject(fastify: FastifyInstance) {
  fastify.put<{ Params: ProjectParams; Body: UpdateProjectBody }>(
    '/projects/:id/edit',
    async (req, reply) => {
      const { id } = req.params
      const { name, description, visibility } = req.body

      const data: UpdateProjectBody & { slug?: string } = { description, visibility }
      if (name) {
        data.name = name
        data.slug = slugify(name, { lower: true, strict: true })
      }

      try {
        const project = await prisma.project.update({
          where: { id },
          data,
        })

        return reply.status(200).send({ data: project, message: 'Project updated successfully' })
      } catch (error) {
        req.log.error({ error }, 'updateProject error')
        return reply.status(500).send({ message: 'An internal server error occurred' })
      }
    },
  )
}

export function deleteProject(fastify: FastifyInstance) {
  fastify.delete<{ Params: ProjectParams }>('/projects/:id/delete', async (req, reply) => {
    const { id } = req.params

    try {
      await prisma.project.delete({ where: { id } })

      return reply.status(200).send({ message: 'Project deleted successfully' })
    } catch (error) {
      req.log.error({ error }, 'deleteProject error')
      return reply.status(500).send({ message: 'An error occurred during project deletion' })
    }
  })
}
