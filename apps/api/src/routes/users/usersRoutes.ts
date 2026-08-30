import { FastifyInstance } from 'fastify'
import argon2 from 'argon2'

import { prisma } from '../../lib/prisma.js'

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  slug: true,
  role: true,
  avatarId: true,
  emailConfirmed: true,
  createdAt: true,
  updatedAt: true,
}

type UserParams = { id: string }

type FetchUsersQuery = {
  role?: 'ADMIN' | 'EDITOR' | 'GUEST'
  search?: string
  page?: string
  limit?: string
}

type PatchUserBody = {
  name?: string
  email?: string
  password?: string
  role?: 'ADMIN' | 'EDITOR' | 'GUEST'
}

type InviteBody = {
  email: string
  name: string
  role?: 'ADMIN' | 'EDITOR' | 'GUEST'
}

export async function fetchAllUsers(fastify: FastifyInstance) {
  fastify.get<{ Querystring: FetchUsersQuery }>('/users', async (req, reply) => {
    if (req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const { role, search, page = '1', limit = '20' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return reply.status(200).send({ users, total, page: parseInt(page), limit: take })
  })
}

export async function fetchUser(fastify: FastifyInstance) {
  fastify.get<{ Params: UserParams }>('/users/:id', async (req, reply) => {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    })

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return reply.status(200).send(user)
  })
}

export async function updateUser(fastify: FastifyInstance) {
  fastify.patch<{ Params: UserParams; Body: PatchUserBody }>('/users/:id', async (req, reply) => {
    const targetId = req.params.id === 'me' ? req.user.id : req.params.id
    const { name, email, password, role } = req.body
    const isAdmin = req.user.role === 'ADMIN'
    const isSelf = req.user.id === targetId

    if (!isAdmin && !isSelf) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    if (role !== undefined && !isAdmin) {
      return reply.status(403).send({ error: 'Only admins can change roles' })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (password !== undefined) {
      data.password = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      })
    }
    if (role !== undefined && isAdmin) data.role = role

    const user = await prisma.user.update({
      where: { id: targetId },
      data,
      select: USER_SELECT,
    })

    return reply.status(200).send(user)
  })
}

export async function deleteUser(fastify: FastifyInstance) {
  fastify.delete<{ Params: UserParams }>('/users/:id', async (req, reply) => {
    if (req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    await prisma.user.delete({ where: { id: req.params.id } })

    return reply.status(200).send({ message: 'User deleted successfully' })
  })
}

export async function uploadAvatar(fastify: FastifyInstance) {
  fastify.post<{ Params: UserParams }>('/users/:id/avatar', async (req, reply) => {
    const targetId = req.params.id === 'me' ? req.user.id : req.params.id
    const isAdmin = req.user.role === 'ADMIN'
    const isSelf = req.user.id === targetId

    if (!isAdmin && !isSelf) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const file = await req.file()
    if (!file) {
      return reply.status(400).send({ error: 'No file uploaded' })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { avatarId: true },
    })

    if (currentUser?.avatarId) {
      // Delete old avatar record; actual S3 object removal handled by images service
      await prisma.image.delete({ where: { id: currentUser.avatarId } }).catch(() => {})
    }

    const image = await prisma.image.create({
      data: {
        name: file.filename,
        url: '',
        path: '',
        type: 'AVATAR',
        createdById: req.user.id,
      },
    })

    const user = await prisma.user.update({
      where: { id: targetId },
      data: { avatarId: image.id },
      select: USER_SELECT,
    })

    return reply.status(200).send(user)
  })
}

export async function inviteUser(fastify: FastifyInstance) {
  fastify.post<{ Body: InviteBody }>('/users/invite', async (req, reply) => {
    if (req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const { email, name, role = 'GUEST' } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'Email is already registered' })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.emailInvite.create({
      data: { email, name, role, sentById: req.user.id, expiresAt },
    })

    // TODO: queue InviteEmail job via BullMQ

    return reply.status(201).send({ invite })
  })
}
