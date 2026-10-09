import Fastify from 'fastify'
import { describe, it, expect, vi } from 'vitest'

import { env } from '../config/env.js'

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
