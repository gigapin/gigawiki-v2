import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'

import { prisma } from '../../lib/prisma.js'
import { emailQueue } from '../../lib/queue.js'
import { env } from '../../config/env.js'

const INVITE_SELECT = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const
export async function fetchInvites(app: FastifyInstance) {
  app.get('/users/invites', async (req, reply) => {
    if (req.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin access required' })
    const parsed = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid invitation query' })
    const { page, limit } = parsed.data
    const [invites, total] = await Promise.all([
      prisma.emailInvite.findMany({
        where: { acceptedAt: null },
        select: INVITE_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      prisma.emailInvite.count({ where: { acceptedAt: null } }),
    ])
    return reply.send({ invites, total, page, limit })
  })
}
export async function resendInvite(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>('/users/invites/:id/resend', async (req, reply) => {
    if (req.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin access required' })
    const invite = await prisma.emailInvite.findUnique({ where: { id: req.params.id } })
    if (!invite) return reply.status(404).send({ error: 'Invite not found' })
    if (invite.acceptedAt) return reply.status(409).send({ error: 'Invite already accepted' })
    if (await prisma.user.findUnique({ where: { email: invite.email } }))
      return reply.status(409).send({ error: 'Email is already registered' })
    const token = nanoid(32)
    const expiresAt = new Date(Date.now() + 7 * 86400000)
    const changed = await prisma.emailInvite.updateMany({
      where: { id: invite.id, acceptedAt: null, token: invite.token },
      data: { token, expiresAt },
    })
    if (changed.count !== 1)
      return reply.status(409).send({ error: 'Invite changed. Refresh the list.' })
    const acceptUrl = new URL('/accept-invite', env.FRONTEND_URL)
    acceptUrl.searchParams.set('token', token)
    try {
      await emailQueue.add('invite', {
        to: invite.email,
        template: 'invite',
        data: {
          inviterName: req.user.email,
          role: invite.role,
          acceptUrl: acceptUrl.toString(),
          expiresAt: expiresAt.toISOString(),
        },
      })
    } catch (error) {
      req.log.error(error, 'Unable to queue invitation')
      return reply.status(503).send({
        code: 'INVITE_DELIVERY_FAILED',
        error: 'The invitation was saved, but its email could not be queued. You can resend it.',
      })
    }
    return reply.send({ message: 'Invitation email queued.' })
  })
}
export async function cancelInvite(app: FastifyInstance) {
  app.delete<{ Params: { id: string } }>('/users/invites/:id', async (req, reply) => {
    if (req.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin access required' })
    const deleted = await prisma.emailInvite.deleteMany({
      where: { id: req.params.id, acceptedAt: null },
    })
    if (!deleted.count)
      return reply.status(409).send({ error: 'Invite was accepted or already removed.' })
    return reply.status(204).send()
  })
}
