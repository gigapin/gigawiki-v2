import Fastify from 'fastify'
import { describe, it, expect, vi } from 'vitest'

import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'

vi.mock('../lib/prisma.js', () => ({ prisma: { user: { findUnique: vi.fn() } } }))

import authPlugin from './auth.js'

vi.mock('../config/env.js', () => ({
  env: { NODE_ENV: 'test', JWT_SECRET: 'session-test-secret', JWT_ACCESS_EXPIRES_IN: '15m' },
}))

describe('Access token expiration policy', () => {
  it.each(['development', 'test', 'production'] as const)(
    'applies the expiration policy in %s',
    async (environment) => {
      env.NODE_ENV = environment
      const app = Fastify()
      app.register(authPlugin)
      app.get('/private', { preHandler: async (request) => request.jwtVerify() }, async () => ({
        ok: true,
      }))
      await app.ready()
      const token = app.jwt.sign({ id: 'user', email: 'user@example.com', role: 'GUEST' })
      const payload = app.jwt.decode<{ iat: number; exp?: number }>(token)
      if (environment === 'development') expect(payload?.exp).toBeUndefined()
      else expect((payload?.exp ?? 0) - (payload?.iat ?? 0)).toBe(900)
      const res = await app.inject({
        method: 'GET',
        url: '/private',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      await app.close()
    },
  )
})

it('uses the current role and refuses revoked, legacy and deleted-account JWTs', async () => {
  env.NODE_ENV = 'development'
  const app = Fastify()
  app.register(authPlugin)
  app.get(
    '/private',
    { preHandler: async (req, reply) => app.authenticate(req, reply) },
    async (req) => ({ role: req.user.role }),
  )
  await app.ready()
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user',
    email: 'user@example.com',
    role: 'GUEST',
    authVersion: 2,
  } as never)
  const token = (authVersion?: number) =>
    app.jwt.sign({
      id: 'user',
      email: 'old@example.com',
      role: 'ADMIN',
      ...(authVersion === undefined ? {} : { authVersion }),
    })
  for (const authVersion of [undefined, 1])
    expect(
      (
        await app.inject({
          url: '/private',
          headers: { authorization: `Bearer ${token(authVersion)}` },
        })
      ).statusCode,
    ).toBe(401)
  const allowed = await app.inject({
    url: '/private',
    headers: { authorization: `Bearer ${token(2)}` },
  })
  expect(allowed.json().role).toBe('GUEST')
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
  expect(
    (await app.inject({ url: '/private', headers: { authorization: `Bearer ${token(2)}` } }))
      .statusCode,
  ).toBe(401)
  await app.close()
})
