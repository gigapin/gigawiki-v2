import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { Role } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'

import {
  login,
  logout,
  refresh,
  register,
  forgotPassword,
  resetPassword,
  verifyEmail,
  acceptInvite,
  me,
} from './authRoutes.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    emailInvite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    setting: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
  verify: vi.fn().mockResolvedValue(true),
  argon2id: 2,
}))

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '30d',
  },
}))

vi.mock('../../lib/redis.js', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    getdel: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('../../lib/queue.js', () => ({
  emailQueue: {
    add: vi.fn().mockResolvedValue(undefined),
  },
}))

const mockUser = vi.mocked(prisma.user)
const mockRefreshToken = vi.mocked(prisma.refreshToken)
//const mockEmailInvite = vi.mocked(prisma.emailInvite)
const mockSetting = vi.mocked(prisma.setting)

function buildApp() {
  const app = Fastify()
  app.register(jwt, { secret: 'test-secret' })
  app.register(cookie)
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
  app.register(login)
  app.register(logout)
  app.register(refresh)
  app.register(register)
  app.register(forgotPassword)
  app.register(resetPassword)
  app.register(verifyEmail)
  app.register(acceptInvite)
  app.register(me)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeUser = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  slug: 'alice',
  role: Role.GUEST,
  password: 'hashed_password',
  emailConfirmed: true,
  emailVerifiedAt: null,
  avatarId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const fakeRefreshToken = {
  id: 'rt-1',
  userId: 'user-1',
  token: 'valid-refresh-token',
  expiresAt: new Date(Date.now() + 86400000),
  revokedAt: null,
  createdAt: new Date(),
}

describe('POST /auth/login', () => {
  it('returns 200 with accessToken on valid credentials', async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser)
    mockRefreshToken.create.mockResolvedValue(fakeRefreshToken)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alice@example.com', password: 'secret' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('accessToken')
  })

  it('returns 401 when user is not found', async () => {
    mockUser.findUnique.mockResolvedValue(null)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'secret' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when password is wrong', async () => {
    const argon2 = await import('argon2')
    vi.mocked(argon2.verify).mockResolvedValueOnce(false)
    mockUser.findUnique.mockResolvedValue(fakeUser)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alice@example.com', password: 'wrong' },
    })

    expect(res.statusCode).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  it('returns 204 and clears cookie', async () => {
    mockRefreshToken.updateMany.mockResolvedValue({ count: 1 })

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { refreshToken: 'some-token' },
    })

    expect(res.statusCode).toBe(204)
    expect(mockRefreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: 'some-token' } }),
    )
  })
})

describe('POST /auth/refresh', () => {
  it('returns 200 with new accessToken on valid cookie', async () => {
    mockRefreshToken.findFirst.mockResolvedValue(fakeRefreshToken)
    mockUser.findUnique.mockResolvedValue(fakeUser)
    mockRefreshToken.delete.mockResolvedValue(fakeRefreshToken)
    mockRefreshToken.create.mockResolvedValue(fakeRefreshToken)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refreshToken: 'valid-refresh-token' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('accessToken')
  })

  it('returns 401 when refresh cookie is missing', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'POST', url: '/auth/refresh' })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when refresh token is revoked or expired', async () => {
    mockRefreshToken.findFirst.mockResolvedValue(null)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refreshToken: 'revoked-token' },
    })

    expect(res.statusCode).toBe(401)
  })
})

describe('POST /auth/register', () => {
  it('returns 201 on successful registration', async () => {
    mockSetting.findUnique.mockResolvedValue(null)
    mockUser.create.mockResolvedValue(fakeUser)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Alice', email: 'alice@example.com', password: 'password123' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().message).toContain('Registration successful')
  })

  it('returns 403 when ALLOW_SELF_REGISTRATION is false', async () => {
    mockSetting.findUnique.mockResolvedValue({
      key: 'ALLOW_SELF_REGISTRATION',
      value: 'false',
    } as never)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Alice', email: 'alice@example.com', password: 'password123' },
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('POST /auth/forgot-password', () => {
  it('always returns 200 regardless of whether user exists', async () => {
    mockUser.findUnique.mockResolvedValue(null)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: 'nobody@example.com' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 200 and queues reset email when user exists', async () => {
    const { emailQueue } = await import('../../lib/queue.js')
    mockUser.findUnique.mockResolvedValue(fakeUser)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: 'alice@example.com' },
    })

    expect(res.statusCode).toBe(200)
    expect(emailQueue.add).toHaveBeenCalledWith('reset-password', expect.any(Object))
  })
})

describe('POST /auth/reset-password', () => {
  it('returns 200 on valid token', async () => {
    const { redis } = await import('../../lib/redis.js')
    vi.mocked(redis.getdel).mockResolvedValueOnce('user-1')
    mockUser.update.mockResolvedValue(fakeUser)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: 'valid-token', newPassword: 'newpassword123' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 400 on invalid or expired token', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: 'bad-token', newPassword: 'newpassword123' },
    })

    expect(res.statusCode).toBe(400)
  })
})

describe('GET /auth/me', () => {
  it('returns 200 with user when authenticated', async () => {
    const { ...userWithoutPassword } = fakeUser
    mockUser.findUnique.mockResolvedValue({ ...userWithoutPassword, avatar: null } as never)

    const app = buildApp()
    await app.ready()
    const token = app.jwt.sign({ id: 'user-1', email: 'alice@example.com', role: 'GUEST' })

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('user')
  })

  it('returns 401 without a token', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/auth/me' })

    expect(res.statusCode).toBe(401)
  })
})
