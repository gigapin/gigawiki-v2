import { FastifyInstance } from 'fastify'
import argon2 from 'argon2'
import slugify from 'slugify'

import { prisma } from '../../lib/prisma.js'

type CreateUserBody = {
  email: string
  name: string
  password: string
}

type UpdateUserBody = {
  email?: string
  name?: string
  password?: string
}

type FetchUserId = {
  id: string
}

type FetchUsers = {
  name: string
  email: string
}

export function createUser(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateUserBody }>('/users/create', async (request, reply) => {
    const { email, name, password } = request.body

    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })

    const slug = slugify(name, { lower: true, strict: true })

    try {
      const user = await prisma.user.create({
        data: { email, name, password: hash, slug },
        select: {
          id: true,
          name: true,
          email: true,
          slug: true,
          role: true,
          createdAt: true,
        },
      })

      return reply.status(201).send(user)
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        return reply.status(409).send({ error: 'Email already in use' })
      }
      throw error
    }
  })
}

export function fetchUser(fastify: FastifyInstance) {
  fastify.get<{ Params: FetchUserId }>('/users/:id', async (request, reply) => {
    const id = request.params.id

    try {
      const user = await prisma.user.findUnique({
        where: { id: id },
      })

      if (!user) {
        throw new Error('User not found')
      }

      return reply.send(user)
    } catch (error) {
      request.log.error({ error }, 'fetchUser error')
      return reply.code(404).send({ error: 'User not found' })
    }
  })
}

export function fetchAllUsers(fastify: FastifyInstance) {
  fastify.get<{ Body: FetchUsers[] }>('/users', async (req, reply) => {
    try {
      const users = await prisma.user.findMany()

      if (!users) {
        return reply.code(404).send({ message: "There aren't users yet" })
      }

      return reply.code(200).send({ users, message: 'All users are fetched' })
    } catch (error) {
      req.log.error({ error }, 'fetchAllUsers error')
      return reply.code(500).send({ message: 'Something went wrong' })
    }
  })
}

export function updateUser(fastify: FastifyInstance) {
  fastify.put<{ Params: FetchUserId; Body: UpdateUserBody }>(
    '/users/:id/edit',
    async (req, reply) => {
      const id = req.params.id
      const data = req.body

      try {
        const user = await prisma.user.update({
          where: { id: id },
          data: { email: data.email, name: data.name, password: data.password },
        })

        if (!user) {
          return reply.code(404).send('User not found')
        }

        return reply.code(200).send({ data: user, message: 'User updated successfully' })
      } catch (error) {
        req.log.error({ error }, 'updateUser error')
        return reply.code(500).send('An internal server error occurred')
      }
    },
  )
}

export function deleteUser(fastify: FastifyInstance) {
  fastify.delete<{ Params: FetchUserId }>('/users/:id/delete', async (req, reply) => {
    const id = req.params.id

    try {
      const user = await prisma.user.delete({
        where: { id: id },
      })

      if (!user) {
        return reply.code(404).send('User not found')
      }

      return reply.code(201).send({ message: 'User deleted successfully' })
    } catch (error) {
      req.log.error({ error }, 'deleteUser error')
      return reply.code(500).send({ message: 'An error occurred during user deletion' })
    }
  })
}
