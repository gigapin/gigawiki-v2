import { FastifyInstance } from 'fastify'
import argon2 from 'argon2'
import { z } from 'zod'
import sharp from 'sharp'
import { nanoid } from 'nanoid'

import { uploadFile, deleteFile } from '../../lib/storage.js'
import { queueVerificationEmail } from '../../lib/verification-email.js'
import { env } from '../../config/env.js'
import { emailQueue } from '../../lib/queue.js'
import { prisma } from '../../lib/prisma.js'

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  slug: true,
  role: true,
  avatarId: true,
  avatar: true,
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
    const parsed = z
      .object({
        name: z.string().trim().min(1).max(100).optional(),
        email: z.string().trim().toLowerCase().pipe(z.email()).optional(),
        password: z.string().min(8).max(128).optional(),
        role: z.enum(['ADMIN', 'EDITOR', 'GUEST']).optional(),
      })
      .strict()
      .safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid profile fields' })
    const { name, email, password, role } = parsed.data
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
    let emailChanged = false
    if (email !== undefined) {
      const current = await prisma.user.findUnique({ where: { id: targetId } })
      if (!current) return reply.status(404).send({ error: 'User not found' })
      emailChanged = email !== current.email
      if (emailChanged) {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) return reply.status(409).send({ error: 'Email is already registered' })
        data.email = email
        data.emailConfirmed = false
        data.emailVerifiedAt = null
      }
    }
    if (password !== undefined) {
      data.password = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      })
    }
    if (role !== undefined && isAdmin) data.role = role

    try {
      const user = await prisma.user.update({ where: { id: targetId }, data, select: USER_SELECT })
      if (emailChanged) {
        try {
          await queueVerificationEmail(user)
        } catch (error) {
          req.log.error(error, 'Unable to queue profile verification')
          return reply.status(200).send({ ...user, verificationDeliveryFailed: true })
        }
      }
      return reply.status(200).send(user)
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        return reply.status(409).send({ error: 'Email is already registered' })
      if ((error as { code?: string }).code === 'P2025')
        return reply.status(404).send({ error: 'User not found' })
      throw error
    }
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

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
      return reply.status(400).send({ error: 'Choose a JPEG, PNG, WebP or GIF image.' })
    const currentUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    })
    if (!currentUser) return reply.status(404).send({ error: 'User not found' })
    const buffer = await file.toBuffer()
    if (file.file.truncated || buffer.length > 10 * 1024 * 1024)
      return reply.status(413).send({ error: 'Images must be at most 10 MB.' })
    let processed: Buffer
    try {
      processed = await sharp(buffer)
        .rotate()
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer()
    } catch {
      return reply.status(400).send({ error: 'Unable to read this image.' })
    }
    const key = `uploads/${targetId}/avatars/${nanoid(10)}.webp`
    await uploadFile(key, processed, 'image/webp')
    let image
    try {
      image = await prisma.image.create({
        data: {
          name: file.filename,
          url: `${env.API_URL.replace(/\/$/, '')}/uploads/${key}`,
          path: key,
          type: 'AVATAR',
          createdById: req.user.id,
        },
      })
    } catch (error) {
      await deleteFile(key).catch(() => {})
      throw error
    }
    let user
    try {
      user = await prisma.user.update({
        where: { id: targetId },
        data: { avatarId: image.id },
        select: USER_SELECT,
      })
    } catch (error) {
      await prisma.image.delete({ where: { id: image.id } }).catch(() => {})
      await deleteFile(key).catch(() => {})
      throw error
    }
    // Preserve old assets, which may still be referenced by existing content.

    return reply.status(200).send(user)
  })
}

export async function inviteUser(fastify: FastifyInstance) {
  fastify.post<{ Body: InviteBody }>('/users/invite', async (req, reply) => {
    if (req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const parsed = z
      .object({
        email: z.string().trim().toLowerCase().pipe(z.email()),
        role: z.enum(['ADMIN', 'EDITOR', 'GUEST']).default('GUEST'),
      })
      .safeParse(req.body)
    if (!parsed.success)
      return reply.status(400).send({ error: 'Provide a valid email and a valid role.' })
    const { email, role } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'Email is already registered' })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.emailInvite.create({
      // Legacy invite records require a name; the account name is chosen on acceptance.
      data: { email, name: '', role, sentById: req.user.id, expiresAt },
    })

    const acceptUrl = new URL('/accept-invite', env.FRONTEND_URL)
    acceptUrl.searchParams.set('token', invite.token)
    try {
      await emailQueue.add('invite', {
        to: email,
        template: 'invite',
        data: {
          inviterName: req.user.email,
          role,
          acceptUrl: acceptUrl.toString(),
          expiresAt: invite.expiresAt.toISOString(),
        },
      })
    } catch (error) {
      req.log.error(error, 'Unable to queue invitation email')
      return reply.status(503).send({
        code: 'INVITE_DELIVERY_FAILED',
        error: 'The invitation was created, but the email could not be queued.',
      })
    }

    return reply.status(201).send({ invite })
  })
}

// A small directory for mentions; administration fields remain on the Admin-only endpoint.
export async function fetchMentionUsers(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { search?: string } }>('/users/mentions', async (req, reply) => {
    const search = req.query.search?.trim().slice(0, 100) ?? ''
    const users = await prisma.user.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
      select: { id: true, name: true },
      take: 8,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    })
    return reply.send({ users })
  })
}
