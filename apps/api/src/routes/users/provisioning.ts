import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import * as argon2 from 'argon2'

import { adminTransaction, apiError, requireAdmin } from '../../lib/admin-transaction.js'
import { generateUniqueSlug } from '../../lib/slugify.js'

export async function provisioningRoutes(app: FastifyInstance) {
  app.post('/users', async (req) => {
    if (req.user.role !== 'ADMIN') throw apiError(403, 'Admin access required')
    const input = z
      .object({
        name: z.string().trim().min(1).max(100),
        email: z.string().trim().toLowerCase().email(),
        role: z.enum(['ADMIN', 'EDITOR', 'GUEST']),
        attestEmail: z.literal(true),
      })
      .strict()
      .parse(req.body)
    const temporaryPassword = nanoid(24)
    const password = await argon2.hash(temporaryPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const user = await adminTransaction(async (tx) => {
      await requireAdmin(tx, req.user.id)
      const slug = await generateUniqueSlug(input.name, async (candidate) =>
        Boolean(await tx.user.findUnique({ where: { slug: candidate }, select: { id: true } })),
      )
      const created = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          slug,
          password,
          emailConfirmed: true,
          emailVerifiedAt: null,
          mustChangePassword: true,
          temporaryPasswordExpiresAt: expiresAt,
        },
        select: { id: true, name: true, email: true, role: true },
      })
      await tx.activity.create({
        data: {
          userId: req.user.id,
          resourceType: 'AUTH',
          type: 'ACCOUNT_CREATED',
          details: `Admin attested email; account ${created.id}`,
          ip: req.ip,
        },
      })
      return created
    })
    return { user, temporaryPassword, expiresAt }
  })
  app.post<{ Params: { id: string } }>('/users/:id/temporary-password', async (req) => {
    if (req.user.role !== 'ADMIN') throw apiError(403, 'Admin access required')
    const temporaryPassword = nanoid(24)
    const password = await argon2.hash(temporaryPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await adminTransaction(async (tx) => {
      await requireAdmin(tx, req.user.id)
      const result = await tx.user.updateMany({
        where: { id: req.params.id, mustChangePassword: true },
        data: { password, temporaryPasswordExpiresAt: expiresAt, authVersion: { increment: 1 } },
      })
      if (result.count !== 1)
        throw apiError(
          409,
          'Only accounts awaiting their initial password change can be reissued credentials',
        )
      await tx.refreshToken.updateMany({
        where: { userId: req.params.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      await tx.activity.create({
        data: {
          userId: req.user.id,
          resourceType: 'AUTH',
          type: 'TEMP_PASSWORD_ISSUED',
          details: `Account ${req.params.id}`,
          ip: req.ip,
        },
      })
    })
    return { temporaryPassword, expiresAt }
  })
}

export async function completeInitialPassword(app: FastifyInstance) {
  app.post(
    '/auth/complete-initial-password',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { passwordChangeToken, newPassword } = z
        .object({
          passwordChangeToken: z.string().max(4096),
          newPassword: z.string().min(8).max(128),
        })
        .strict()
        .parse(req.body)
      let claims: { id: string; authVersion: number; purpose: string }
      try {
        claims = app.jwt.verify(passwordChangeToken)
      } catch {
        throw apiError(401, 'Invalid or expired password change challenge')
      }
      if (claims.purpose !== 'initial-password')
        throw apiError(401, 'Password change challenge required')
      const password = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      })
      await adminTransaction(async (tx) => {
        const account = await tx.user.findUnique({ where: { id: claims.id } })
        if (
          !account?.mustChangePassword ||
          account.authVersion !== claims.authVersion ||
          !account.temporaryPasswordExpiresAt ||
          account.temporaryPasswordExpiresAt <= new Date()
        )
          throw apiError(401, 'Invalid or expired password change challenge')
        if (await argon2.verify(account.password, newPassword))
          throw apiError(400, 'Choose a different password')
        const updated = await tx.user.updateMany({
          where: { id: account.id, authVersion: claims.authVersion, mustChangePassword: true },
          data: {
            password,
            mustChangePassword: false,
            temporaryPasswordExpiresAt: null,
            authVersion: { increment: 1 },
          },
        })
        if (updated.count !== 1) throw apiError(409, 'Account changed. Sign in again.')
        await tx.refreshToken.updateMany({
          where: { userId: account.id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      })
      reply.clearCookie('refreshToken', { path: '/api/v2/auth' })
      return { message: 'Password changed. Sign in with your new password.' }
    },
  )
}
