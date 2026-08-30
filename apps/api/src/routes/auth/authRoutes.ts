import { FastifyInstance, FastifyReply } from 'fastify'
import * as argon2 from 'argon2'
import { nanoid } from 'nanoid'

import { generateUniqueSlug } from '../../lib/slugify.js'
import { prisma } from '../../lib/prisma.js'
import { redis } from '../../lib/redis.js'
import { emailQueue } from '../../lib/queue.js'
import { env } from '../../config/env.js'

type LoginBody = { email: string; password: string }
type RegisterBody = { name: string; email: string; password: string }
type ForgotPasswordBody = { email: string }
type ResetPasswordBody = { token: string; newPassword: string }
type VerifyEmailBody = { token: string }
type AcceptInviteBody = { token: string; name: string; password: string }

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const

const REFRESH_COOKIE = 'refreshToken'
const AUTH_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

function setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v2/auth/refresh',
    expires: expiresAt,
  })
}

async function createRefreshToken(reply: FastifyReply, userId: string) {
  const token = nanoid(64)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { userId, token, expiresAt } })
  setRefreshCookie(reply, token, expiresAt)

  return token
}

export async function login(fastify: FastifyInstance) {
  fastify.post<{ Body: LoginBody }>('/auth/login', AUTH_RATE_LIMIT, async (request, reply) => {
    const { email, password } = request.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await argon2.verify(user.password, password))) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role })
    await createRefreshToken(reply, user.id)

    return reply.status(200).send({ accessToken })
  })
}

export async function logout(fastify: FastifyInstance) {
  fastify.post('/auth/logout', AUTH_RATE_LIMIT, async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE]
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { token },
        data: { revokedAt: new Date() },
      })
    }
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/v2/auth/refresh' })
    return reply.status(204).send()
  })
}

export async function refresh(fastify: FastifyInstance) {
  fastify.post('/auth/refresh', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE]
    if (!token) return reply.status(401).send({ error: 'Missing refresh token' })

    const stored = await prisma.refreshToken.findFirst({
      where: { token, revokedAt: null, expiresAt: { gt: new Date() } },
    })
    if (!stored) return reply.status(401).send({ error: 'Invalid or expired refresh token' })

    const user = await prisma.user.findUnique({ where: { id: stored.userId } })
    if (!user) return reply.status(401).send({ error: 'User not found' })

    await prisma.refreshToken.delete({ where: { id: stored.id } })

    const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role })
    await createRefreshToken(reply, user.id)

    return reply.status(200).send({ accessToken })
  })
}

export async function register(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterBody }>(
    '/auth/register',
    AUTH_RATE_LIMIT,
    async (request, reply) => {
      const { name, email, password } = request.body

      const setting = await prisma.setting.findUnique({
        where: { key: 'ALLOW_SELF_REGISTRATION' },
      })
      if (setting?.value === 'false') {
        return reply.status(403).send({ error: 'Registration is disabled' })
      }

      const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS)
      const slug = await generateUniqueSlug(name, async (candidate) =>
        Boolean(await prisma.user.findUnique({ where: { slug: candidate }, select: { id: true } })),
      )

      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, slug, role: 'GUEST', emailConfirmed: false },
      })

      const verifyToken = nanoid(32)
      await redis.set(`verify:${verifyToken}`, user.id, 'EX', 86400)
      await emailQueue.add('verify-email', { to: email, data: { name, token: verifyToken } })

      return reply
        .status(201)
        .send({ message: 'Registration successful. Please verify your email.' })
    },
  )
}

export async function forgotPassword(fastify: FastifyInstance) {
  fastify.post<{ Body: ForgotPasswordBody }>(
    '/auth/forgot-password',
    AUTH_RATE_LIMIT,
    async (request, reply) => {
      const { email } = request.body

      const user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        const token = nanoid(32)
        await redis.set(`reset:${token}`, user.id, 'EX', 3600)
        await emailQueue.add('reset-password', {
          to: email,
          data: { name: user.name, token },
        })
      }

      return reply
        .status(200)
        .send({ message: 'If that email is registered, a reset link has been sent.' })
    },
  )
}

export async function resetPassword(fastify: FastifyInstance) {
  fastify.post<{ Body: ResetPasswordBody }>(
    '/auth/reset-password',
    AUTH_RATE_LIMIT,
    async (request, reply) => {
      const { token, newPassword } = request.body

      const userId = await redis.getdel(`reset:${token}`)
      if (!userId) return reply.status(400).send({ error: 'Invalid or expired reset token' })

      const hashedPassword = await argon2.hash(newPassword, ARGON2_OPTIONS)
      await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } })

      return reply.status(200).send({ message: 'Password reset successfully.' })
    },
  )
}

export async function verifyEmail(fastify: FastifyInstance) {
  fastify.post<{ Body: VerifyEmailBody }>(
    '/auth/verify-email',
    AUTH_RATE_LIMIT,
    async (request, reply) => {
      const { token } = request.body

      const userId = await redis.getdel(`verify:${token}`)
      if (!userId) return reply.status(400).send({ error: 'Invalid or expired verification token' })

      await prisma.user.update({
        where: { id: userId },
        data: { emailConfirmed: true, emailVerifiedAt: new Date() },
      })

      return reply.status(200).send({ message: 'Email verified.' })
    },
  )
}

export async function acceptInvite(fastify: FastifyInstance) {
  fastify.post<{ Body: AcceptInviteBody }>(
    '/auth/accept-invite',
    AUTH_RATE_LIMIT,
    async (request, reply) => {
      const { token, name, password } = request.body

      const invite = await prisma.emailInvite.findUnique({ where: { token } })
      if (!invite) return reply.status(404).send({ error: 'Invite not found' })
      if (invite.acceptedAt) return reply.status(400).send({ error: 'Invite already accepted' })
      if (invite.expiresAt < new Date()) return reply.status(400).send({ error: 'Invite expired' })

      const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS)
      const slug = await generateUniqueSlug(name, async (candidate) =>
        Boolean(await prisma.user.findUnique({ where: { slug: candidate }, select: { id: true } })),
      )

      const user = await prisma.user.create({
        data: {
          name,
          email: invite.email,
          password: hashedPassword,
          slug,
          role: invite.role,
          emailConfirmed: true,
          emailVerifiedAt: new Date(),
        },
      })

      await prisma.emailInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      })

      const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role })
      await createRefreshToken(reply, user.id)

      return reply.status(201).send({ accessToken })
    },
  )
}

export async function me(fastify: FastifyInstance) {
  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { avatar: true },
      omit: { password: true },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.status(200).send({ user })
  })
}
