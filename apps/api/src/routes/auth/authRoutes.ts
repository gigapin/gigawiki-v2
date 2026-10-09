import { FastifyInstance, FastifyReply } from 'fastify'
import * as argon2 from 'argon2'
import { nanoid } from 'nanoid'
import { z } from 'zod'

import { generateUniqueSlug } from '../../lib/slugify.js'
import { prisma } from '../../lib/prisma.js'
import { redis } from '../../lib/redis.js'
import { emailQueue } from '../../lib/queue.js'
import { env } from '../../config/env.js'
import { queueVerificationEmail } from '../../lib/verification-email.js'

type LoginBody = { email: string; password: string }
type RegisterBody = { name: string; email: string; password: string }
type ForgotPasswordBody = { email: string }
type ResetPasswordBody = { token: string; newPassword: string }
type VerifyEmailBody = { token: string }
type AcceptInviteBody = { token: string; name: string; password: string }

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128),
})
const VerificationTokenSchema = z.object({ token: z.string().min(1).max(128) })
const ResendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
})

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const

const REFRESH_COOKIE = 'refreshToken'
const REFRESH_COOKIE_PATH = '/api/v2/auth'
const AUTH_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

function setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  })
}

async function createRefreshToken(reply: FastifyReply, userId: string) {
  const token = nanoid(64)
  const expiresAt =
    env.NODE_ENV === 'development'
      ? new Date('9999-12-31T23:59:59.000Z')
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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

    if (!user.emailConfirmed) {
      return reply
        .status(403)
        .send({ code: 'EMAIL_NOT_VERIFIED', error: 'Please verify your email before signing in.' })
    }

    const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role })
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/v2/auth/refresh' })
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
    reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
    // Remove cookies issued before the path also included logout.
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/v2/auth/refresh' })
    return reply.status(204).send()
  })
}

export async function refresh(fastify: FastifyInstance) {
  fastify.post('/auth/refresh', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE]
    if (!token) return reply.status(401).send({ error: 'Missing refresh token' })

    const stored = await prisma.refreshToken.findFirst({
      where: {
        token,
        revokedAt: null,
        ...(env.NODE_ENV === 'development' ? {} : { expiresAt: { gt: new Date() } }),
      },
    })
    if (!stored) return reply.status(401).send({ error: 'Invalid or expired refresh token' })

    const user = await prisma.user.findUnique({ where: { id: stored.userId } })
    if (!user) return reply.status(401).send({ error: 'User not found' })

    await prisma.refreshToken.delete({ where: { id: stored.id } })

    const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role })
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/v2/auth/refresh' })
    await createRefreshToken(reply, user.id)

    return reply.status(200).send({ accessToken })
  })
}

export async function register(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterBody }>(
    '/auth/register',
    AUTH_RATE_LIMIT,
    async (request, reply) => {
      const parsed = RegisterSchema.safeParse(request.body)
      if (!parsed.success)
        return reply
          .status(400)
          .send({ error: 'Enter a name, a valid email and a password of 8–128 characters.' })
      const { name, email, password } = parsed.data
      const setting = await prisma.setting.findUnique({ where: { key: 'ALLOW_SELF_REGISTRATION' } })
      if (setting?.value === 'false')
        return reply.status(403).send({ error: 'Registration is disabled' })

      const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS)
      const slug = await generateUniqueSlug(name, async (candidate) =>
        Boolean(await prisma.user.findUnique({ where: { slug: candidate }, select: { id: true } })),
      )
      let user
      try {
        user = await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            slug,
            role: 'GUEST',
            emailConfirmed: false,
          },
        })
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          return reply.status(409).send({
            error:
              'An account with this email already exists. Sign in or request a new verification email.',
          })
        }
        throw error
      }
      try {
        await queueVerificationEmail(user)
      } catch (error) {
        request.log.error({ err: error }, 'Could not queue verification email')
        return reply.status(503).send({
          code: 'VERIFICATION_DELIVERY_FAILED',
          error:
            'Your account was created, but the verification email could not be queued. Request a new verification email.',
        })
      }
      return reply
        .status(201)
        .send({ message: 'Registration successful. Please verify your email.' })
    },
  )
}

export async function resendVerification(fastify: FastifyInstance) {
  fastify.post<{ Body: { email: string } }>(
    '/auth/resend-verification',
    AUTH_RATE_LIMIT,
    async (request, reply) => {
      const parsed = ResendVerificationSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Enter a valid email address.' })
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
      if (user && !user.emailConfirmed) {
        await queueVerificationEmail(user)
      }
      return reply
        .status(200)
        .send({ message: 'If this account needs verification, a new email has been sent.' })
    },
  )
}

export async function forgotPassword(fastify: FastifyInstance) {
  fastify.post<{ Body: ForgotPasswordBody }>(
    '/auth/forgot-password',
    AUTH_RATE_LIMIT,
    async (request, reply) => {
      const parsed = ResendVerificationSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Enter a valid email address.' })
      const { email } = parsed.data

      const user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        try {
          const token = nanoid(32)
          await redis.set(`reset:${token}`, user.id, 'EX', 3600)
          const resetUrl = new URL('/reset-password', env.FRONTEND_URL)
          resetUrl.searchParams.set('token', token)
          await emailQueue.add('reset-password', {
            to: email,
            template: 'reset-password',
            data: { name: user.name, resetUrl: resetUrl.toString() },
          })
        } catch (error) {
          request.log.error(error, 'Unable to queue password reset email')
        }
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
      const parsed = z
        .object({ token: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) })
        .safeParse(request.body)
      if (!parsed.success)
        return reply
          .status(400)
          .send({ error: 'Provide a token and a password of 8–128 characters.' })
      const { token, newPassword } = parsed.data

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
      const parsed = VerificationTokenSchema.safeParse(request.body)
      if (!parsed.success)
        return reply.status(400).send({ error: 'Invalid or expired verification token' })
      const { token } = parsed.data

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
      const parsed = z
        .object({
          token: z.string().min(1).max(128),
          name: z.string().trim().min(1).max(100),
          password: z.string().min(8).max(128),
        })
        .safeParse(request.body)
      if (!parsed.success)
        return reply
          .status(400)
          .send({ error: 'Provide a token, a name and a password of 8–128 characters.' })
      const { token, name, password } = parsed.data

      const invite = await prisma.emailInvite.findUnique({ where: { token } })
      if (!invite) return reply.status(404).send({ error: 'Invite not found' })
      if (invite.acceptedAt) return reply.status(400).send({ error: 'Invite already accepted' })
      if (invite.expiresAt < new Date()) return reply.status(400).send({ error: 'Invite expired' })

      const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS)
      const slug = await generateUniqueSlug(name, async (candidate) =>
        Boolean(await prisma.user.findUnique({ where: { slug: candidate }, select: { id: true } })),
      )

      const user = await prisma.$transaction(async (tx) => {
        const claimed = await tx.emailInvite.updateMany({
          where: { id: invite.id, acceptedAt: null, expiresAt: { gt: new Date() } },
          data: { acceptedAt: new Date() },
        })
        if (claimed.count !== 1) {
          throw Object.assign(new Error('Invite expired or already accepted'), { statusCode: 400 })
        }
        return tx.user.create({
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
