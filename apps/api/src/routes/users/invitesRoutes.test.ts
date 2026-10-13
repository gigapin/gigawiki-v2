import { beforeEach, expect, it, vi } from 'vitest'
import Fastify from 'fastify'

import { prisma } from '../../lib/prisma.js'
import { emailQueue } from '../../lib/queue.js'

import { fetchInvites, resendInvite, cancelInvite } from './invitesRoutes.js'
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    emailInvite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: { findUnique: vi.fn() },
  },
}))
vi.mock('../../lib/queue.js', () => ({ emailQueue: { add: vi.fn() } }))
vi.mock('../../config/env.js', () => ({ env: { FRONTEND_URL: 'http://localhost:5173' } }))
const invite = {
  id: 'i',
  email: 'invited@example.com',
  role: 'GUEST',
  acceptedAt: null,
  token: 'old',
  expiresAt: new Date(0),
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.emailInvite.findUnique).mockResolvedValue(invite as never)
  vi.mocked(prisma.emailInvite.findMany).mockResolvedValue([])
  vi.mocked(prisma.emailInvite.count).mockResolvedValue(0)
  vi.mocked(prisma.emailInvite.updateMany).mockResolvedValue({ count: 1 })
  vi.mocked(prisma.emailInvite.deleteMany).mockResolvedValue({ count: 1 })
})
function app(role = 'ADMIN') {
  const result = Fastify()
  result.addHook('preHandler', async (req) => {
    req.user = { id: 'admin', email: 'admin@example.com', role }
  })
  result.register(fetchInvites)
  result.register(resendInvite)
  result.register(cancelInvite)
  return result
}
it('paginates pending and expired invitations without exposing tokens', async () => {
  const result = await app().inject({ method: 'GET', url: '/users/invites?page=2&limit=10' })
  expect(result.statusCode).toBe(200)
  expect(prisma.emailInvite.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      skip: 10,
      take: 10,
      where: { acceptedAt: null },
      select: expect.not.objectContaining({ token: true }),
    }),
  )
})
it('renews expired invitations with a different token and seven-day expiry', async () => {
  const result = await app().inject({ method: 'POST', url: '/users/invites/i/resend' })
  expect(result.statusCode).toBe(200)
  const update = vi.mocked(prisma.emailInvite.updateMany).mock.calls[0][0]
  expect(update.data?.token).not.toBe('old')
  expect((update.data?.expiresAt as Date).getTime()).toBeGreaterThan(Date.now() + 6 * 86400000)
  expect(emailQueue.add).toHaveBeenCalledWith(
    'invite',
    expect.objectContaining({
      data: expect.objectContaining({ acceptUrl: expect.stringContaining('token=') }),
    }),
  )
})
it('allows retry when delivery fails after updating an invitation', async () => {
  vi.mocked(emailQueue.add).mockRejectedValueOnce(new Error('offline'))
  const result = await app().inject({ method: 'POST', url: '/users/invites/i/resend' })
  expect(result.statusCode).toBe(503)
  expect(result.json().code).toBe('INVITE_DELIVERY_FAILED')
})
it('does not overwrite an invitation accepted or resent concurrently', async () => {
  vi.mocked(prisma.emailInvite.updateMany).mockResolvedValue({ count: 0 })
  const result = await app().inject({ method: 'POST', url: '/users/invites/i/resend' })
  expect(result.statusCode).toBe(409)
  expect(emailQueue.add).not.toHaveBeenCalled()
})
it('refuses to resend accepted invitations', async () => {
  vi.mocked(prisma.emailInvite.findUnique).mockResolvedValue({
    ...invite,
    acceptedAt: new Date(),
  } as never)
  const result = await app().inject({ method: 'POST', url: '/users/invites/i/resend' })
  expect(result.statusCode).toBe(409)
  expect(prisma.emailInvite.updateMany).not.toHaveBeenCalled()
})
it('cancels only an invitation that is still pending', async () => {
  const result = await app().inject({ method: 'DELETE', url: '/users/invites/i' })
  expect(result.statusCode).toBe(204)
  expect(prisma.emailInvite.deleteMany).toHaveBeenCalledWith({
    where: { id: 'i', acceptedAt: null },
  })
})
it.each(['GUEST', 'EDITOR'])('denies invitation management to %s', async (role) => {
  for (const [method, url] of [
    ['GET', '/users/invites'],
    ['POST', '/users/invites/i/resend'],
    ['DELETE', '/users/invites/i'],
  ] as const)
    expect((await app(role).inject({ method, url })).statusCode).toBe(403)
})
