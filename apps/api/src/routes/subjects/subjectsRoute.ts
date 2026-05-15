import { FastifyInstance } from 'fastify'
import slugify from 'slugify'

import { prisma } from '../../lib/prisma.js'

type CreateSubjectBody = {
  name: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type UpdateSubjectBody = {
  name?: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type SubjectParams = {
  id: string
}

export function createSubject(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateSubjectBody }>('/subjects/create', async (request, reply) => {
    const { name, description, visibility } = request.body

    const userId = request.user.id
    const role = request.user.role
    const slug = slugify(name, { lower: true, strict: true })

    try {
      if (role === 'GUEST') {
        return reply.status(403).send({ message: 'You are not authorized' })
      }
      const subject = await prisma.subject.create({
        data: { userId, name, slug, description, visibility },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          visibility: true,
          userId: true,
          createdAt: true,
        },
      })

      return reply.status(201).send(subject)
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        return reply.status(409).send({ error: 'Subject name already in use' })
      }
      throw error
    }
  })
}

export function fetchSubject(fastify: FastifyInstance) {
  fastify.get<{ Params: SubjectParams }>('/subjects/:id', async (req, reply) => {
    const { id } = req.params

    try {
      const subject = await prisma.subject.findUnique({
        where: { id, deletedAt: null },
      })

      if (!subject) {
        return reply.status(404).send({ error: 'Subject not found' })
      }

      return reply.send(subject)
    } catch (error) {
      req.log.error({ error }, 'fetchSubject error')
      return reply.status(404).send({ error: 'Subject not found' })
    }
  })
}

export function fetchAllSubjects(fastify: FastifyInstance) {
  fastify.get('/subjects', async (req, reply) => {
    try {
      const subjects = await prisma.subject.findMany({
        where: { deletedAt: null },
      })

      return reply.status(200).send({ subjects, message: 'All subjects fetched' })
    } catch (error) {
      req.log.error({ error }, 'fetchAllSubjects error')
      return reply.status(500).send({ message: 'Something went wrong' })
    }
  })
}

export function updateSubject(fastify: FastifyInstance) {
  fastify.put<{ Params: SubjectParams; Body: UpdateSubjectBody }>(
    '/subjects/:id/edit',
    async (req, reply) => {
      const { id } = req.params
      const { name, description, visibility } = req.body

      const data: UpdateSubjectBody & { slug?: string } = { description, visibility }
      if (name) {
        data.name = name
        data.slug = slugify(name, { lower: true, strict: true })
      }

      try {
        const subject = await prisma.subject.update({
          where: { id },
          data,
        })

        return reply.status(200).send({ data: subject, message: 'Subject updated successfully' })
      } catch (error) {
        req.log.error({ error }, 'updateSubject error')
        return reply.status(500).send({ message: 'An internal server error occurred' })
      }
    },
  )
}

export function deleteSubject(fastify: FastifyInstance) {
  fastify.delete<{ Params: SubjectParams }>('/subjects/:id/delete', async (req, reply) => {
    const { id } = req.params

    try {
      await prisma.subject.delete({ where: { id } })

      return reply.status(200).send({ message: 'Subject deleted successfully' })
    } catch (error) {
      req.log.error({ error }, 'deleteSubject error')
      return reply.status(500).send({ message: 'An error occurred during subject deletion' })
    }
  })
}
