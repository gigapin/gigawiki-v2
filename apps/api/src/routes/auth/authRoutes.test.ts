import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { Role } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'
import { redis } from '../../lib/redis.js'
import { env } from '../../config/env.js'
import { emailQueue } from '../../lib/queue.js'

import {
  login,
  logout,
  refresh,
  register,
  resendVerification,
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
    $transaction: vi.fn(),
    emailInvite: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
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
    FRONTEND_URL: 'http://localhost:5173',
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
  app.register(resendVerification)
  app.register(forgotPassword)
  app.register(resetPassword)
  app.register(verifyEmail)
  app.register(acceptInvite)
  app.register(me)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  env.NODE_ENV = 'test'
  vi.mocked(prisma.$transaction).mockImplementation((async (
    callback: (tx: typeof prisma) => unknown,
  ) => callback(prisma)) as never)
  vi.mocked(prisma.emailInvite.updateMany).mockResolvedValue({ count: 1 })
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
    expect(res.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'refreshToken',
          path: '/api/v2/auth',
          httpOnly: true,
          sameSite: 'Strict',
        }),
      ]),
    )
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
    expect(res.cookies.map((cookie) => cookie.path)).toEqual(
      expect.arrayContaining(['/api/v2/auth', '/api/v2/auth/refresh']),
    )
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
    expect(res.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'refreshToken',
          path: '/api/v2/auth',
          httpOnly: true,
          sameSite: 'Strict',
        }),
      ]),
    )
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
  beforeEach(() => {
    mockUser.findUnique.mockResolvedValue(null)
    mockUser.create.mockResolvedValue(fakeUser)
    mockSetting.findUnique.mockResolvedValue({
      key: 'ALLOW_SELF_REGISTRATION',
      value: 'true',
    } as never)
  })
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

describe('Registration and email verification', () => {
  it('queues a complete verification job with a usable frontend link', async () => {
    mockSetting.findUnique.mockResolvedValue({ value: 'true' } as never)
    mockUser.findUnique.mockResolvedValue(null)
    mockUser.create.mockResolvedValue({ ...fakeUser, emailConfirmed: false })
    const res = await buildApp().inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: ' Alice ', email: ' ALICE@example.com ', password: 'password123' },
    })
    expect(res.statusCode).toBe(201)
    expect(mockUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'hashed_password',
        role: 'GUEST',
        emailConfirmed: false,
      }),
    })
    const payload = vi.mocked(emailQueue.add).mock.calls[0][1]
    expect(payload).toMatchObject({
      to: 'alice@example.com',
      template: 'verify',
      data: { name: 'Alice' },
    })
    const url = new URL(payload.data.verifyUrl)
    expect(url.origin).toBe('http://localhost:5173')
    expect(url.pathname).toBe('/verify-email')
    const token = url.searchParams.get('token')
    expect(token).toHaveLength(32)
    expect(redis.set).toHaveBeenCalledWith(`verify:${token}`, 'user-1', 'EX', 86400)
  })

  it.each([
    { name: '', email: 'alice@example.com', password: 'password123' },
    { name: 'Alice', email: 'invalid', password: 'password123' },
    { name: 'Alice', email: 'alice@example.com', password: 'short' },
  ])('rejects invalid registration data before creating a user', async (payload) => {
    const res = await buildApp().inject({ method: 'POST', url: '/auth/register', payload })
    expect(res.statusCode).toBe(400)
    expect(mockUser.create).not.toHaveBeenCalled()
    expect(emailQueue.add).not.toHaveBeenCalled()
  })

  it('returns a useful conflict when the email is already registered', async () => {
    mockSetting.findUnique.mockResolvedValue(null)
    mockUser.findUnique.mockResolvedValue(null)
    mockUser.create.mockRejectedValueOnce(Object.assign(new Error('Duplicate'), { code: 'P2002' }))
    const res = await buildApp().inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Alice', email: 'alice@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toContain('already exists')
    expect(emailQueue.add).not.toHaveBeenCalled()
  })

  it('distinguishes a created account from a verification queue failure', async () => {
    mockSetting.findUnique.mockResolvedValue(null)
    mockUser.findUnique.mockResolvedValue(null)
    mockUser.create.mockResolvedValue(fakeUser)
    vi.mocked(emailQueue.add).mockRejectedValueOnce(new Error('Queue unavailable'))
    const res = await buildApp().inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Alice', email: 'alice@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(503)
    expect(res.json().code).toBe('VERIFICATION_DELIVERY_FAILED')
    expect(mockUser.create).toHaveBeenCalledTimes(1)
  })

  it('prevents sign-in until the email has been verified', async () => {
    mockUser.findUnique.mockResolvedValue({ ...fakeUser, emailConfirmed: false })
    const res = await buildApp().inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alice@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().code).toBe('EMAIL_NOT_VERIFIED')
    expect(mockRefreshToken.create).not.toHaveBeenCalled()
  })

  it('confirms a valid token once and permits subsequent sign-in', async () => {
    vi.mocked(redis.getdel).mockResolvedValueOnce('user-1').mockResolvedValueOnce(null)
    mockUser.update.mockResolvedValue(fakeUser)
    const app = buildApp()
    const verified = await app.inject({
      method: 'POST',
      url: '/auth/verify-email',
      payload: { token: 'test-token' },
    })
    expect(verified.statusCode).toBe(200)
    expect(mockUser.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { emailConfirmed: true, emailVerifiedAt: expect.any(Date) },
    })
    const reused = await app.inject({
      method: 'POST',
      url: '/auth/verify-email',
      payload: { token: 'test-token' },
    })
    expect(reused.statusCode).toBe(400)
    mockUser.findUnique.mockResolvedValue(fakeUser)
    mockRefreshToken.create.mockResolvedValue(fakeRefreshToken)
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alice@example.com', password: 'password123' },
    })
    expect(login.statusCode).toBe(200)
    expect(login.json().accessToken).toBeTruthy()
  })

  it('rejects missing verification tokens before accessing Redis', async () => {
    const res = await buildApp().inject({ method: 'POST', url: '/auth/verify-email', payload: {} })
    expect(res.statusCode).toBe(400)
    expect(redis.getdel).not.toHaveBeenCalled()
  })

  it.each([null, fakeUser])(
    'does not disclose unknown or verified accounts on resend',
    async (user) => {
      mockUser.findUnique.mockResolvedValue(user)
      const res = await buildApp().inject({
        method: 'POST',
        url: '/auth/resend-verification',
        payload: { email: 'alice@example.com' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().message).toContain('If this account needs verification')
      expect(emailQueue.add).not.toHaveBeenCalled()
    },
  )

  it('resends a complete verification job for unverified users', async () => {
    mockUser.findUnique.mockResolvedValue({ ...fakeUser, emailConfirmed: false })
    const res = await buildApp().inject({
      method: 'POST',
      url: '/auth/resend-verification',
      payload: { email: 'alice@example.com' },
    })
    expect(res.statusCode).toBe(200)
    expect(emailQueue.add).toHaveBeenCalledWith(
      'verify-email',
      expect.objectContaining({
        template: 'verify',
        data: expect.objectContaining({
          verifyUrl: expect.stringContaining('/verify-email?token='),
        }),
      }),
    )
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
    expect(emailQueue.add).toHaveBeenCalledWith(
      'reset-password',
      expect.objectContaining({
        template: 'reset-password',
        data: expect.objectContaining({
          resetUrl: expect.stringMatching(/^http:\/\/localhost:5173\/reset-password\?token=.+/),
        }),
      }),
    )
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

describe('Password and invitation validation', () => {
  it('normalizes recovery emails and rejects invalid addresses', async () => {
    mockUser.findUnique.mockResolvedValue(null)
    const app = buildApp()
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/forgot-password',
          payload: { email: ' Alice@Example.com ' },
        })
      ).statusCode,
    ).toBe(200)
    expect(mockUser.findUnique).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } })
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/forgot-password',
          payload: { email: 'invalid' },
        })
      ).statusCode,
    ).toBe(400)
    await app.close()
  })
  it.each(['short', 'x'.repeat(129)])(
    'rejects invalid passwords without consuming the reset token',
    async (newPassword) => {
      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: { token: 'valid-token', newPassword },
      })
      expect(res.statusCode).toBe(400)
      expect(redis.getdel).not.toHaveBeenCalled()
      expect(mockUser.update).not.toHaveBeenCalled()
      await app.close()
    },
  )
  it.each([
    { token: '', name: 'Alice', password: 'password123' },
    { token: 'invite', name: '   ', password: 'password123' },
    { token: 'invite', name: 'Alice', password: 'short' },
  ])('validates invitation fields before lookup', async (payload) => {
    const app = buildApp()
    const res = await app.inject({ method: 'POST', url: '/auth/accept-invite', payload })
    expect(res.statusCode).toBe(400)
    expect(prisma.emailInvite.findUnique).not.toHaveBeenCalled()
    await app.close()
  })
  it.each([
    [null, 404],
    [{ acceptedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) }, 400],
    [{ acceptedAt: null, expiresAt: new Date(0) }, 400],
  ])('rejects missing, accepted or expired invitations', async (invite, status) => {
    vi.mocked(prisma.emailInvite.findUnique).mockResolvedValue(invite as never)
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/accept-invite',
      payload: { token: 'invite', name: 'Alice', password: 'password123' },
    })
    expect(res.statusCode).toBe(status)
    expect(mockUser.create).not.toHaveBeenCalled()
    await app.close()
  })
  it('uses the invited email/role, verifies the account and creates an authenticated session', async () => {
    vi.mocked(prisma.emailInvite.findUnique).mockResolvedValue({
      id: 'invite',
      email: 'invited@example.com',
      role: 'EDITOR',
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
    } as never)
    mockUser.findUnique.mockResolvedValue(null)
    mockUser.create.mockResolvedValue({
      ...fakeUser,
      email: 'invited@example.com',
      role: Role.EDITOR,
    })
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/accept-invite',
      payload: {
        token: 'invite',
        name: ' Alice ',
        password: 'password123',
        role: 'ADMIN',
        email: 'override@example.com',
      },
    })
    expect(res.statusCode).toBe(201)
    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Alice',
          email: 'invited@example.com',
          role: 'EDITOR',
          emailConfirmed: true,
        }),
      }),
    )
    expect(prisma.emailInvite.updateMany).toHaveBeenCalledWith({
      where: { id: 'invite', acceptedAt: null, expiresAt: { gt: expect.any(Date) } },
      data: { acceptedAt: expect.any(Date) },
    })
    expect(res.json().accessToken).toBeTruthy()
    expect(res.headers['set-cookie']).toContain('HttpOnly')
    await app.close()
  })
})

it('keeps the recovery response neutral when the email queue fails', async () => {
  mockUser.findUnique.mockResolvedValue(fakeUser)
  vi.mocked(emailQueue.add).mockRejectedValueOnce(new Error('offline'))
  const app = buildApp()
  const res = await app.inject({
    method: 'POST',
    url: '/auth/forgot-password',
    payload: { email: 'alice@example.com' },
  })
  expect(res.statusCode).toBe(200)
  expect(res.json().message).toContain('If that email is registered')
  await app.close()
})
it('does not create an account or session when an invitation was claimed concurrently', async () => {
  vi.mocked(prisma.emailInvite.findUnique).mockResolvedValue({
    id: 'invite',
    email: 'invited@example.com',
    role: 'EDITOR',
    acceptedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
  } as never)
  mockUser.findUnique.mockResolvedValue(null)
  vi.mocked(prisma.emailInvite.updateMany).mockResolvedValueOnce({ count: 0 })
  const app = buildApp()
  const res = await app.inject({
    method: 'POST',
    url: '/auth/accept-invite',
    payload: { token: 'invite', name: 'Alice', password: 'password123' },
  })
  expect(res.statusCode).toBe(400)
  expect(mockUser.create).not.toHaveBeenCalled()
  expect(mockRefreshToken.create).not.toHaveBeenCalled()
  await app.close()
})

describe('Development session persistence', () => {
  it('issues a persistent refresh cookie in development', async () => {
    env.NODE_ENV = 'development'
    mockUser.findUnique.mockResolvedValue({ ...fakeUser, emailConfirmed: true })
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alice@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(200)
    expect(mockRefreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ expiresAt: new Date('9999-12-31T23:59:59.000Z') }),
    })
    expect(String(res.headers['set-cookie'])).toContain('Expires=Fri, 31 Dec 9999')
    expect(String(res.headers['set-cookie'])).toContain('HttpOnly')
    await app.close()
  })
  it.each(['test', 'production'] as const)('keeps refresh expiry in %s', async (environment) => {
    env.NODE_ENV = environment
    mockUser.findUnique.mockResolvedValue({ ...fakeUser, emailConfirmed: true })
    const before = Date.now()
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alice@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(200)
    const expiry = vi.mocked(mockRefreshToken.create).mock.calls[0][0].data.expiresAt as Date
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 30 * 86400000)
    expect(expiry.getTime()).toBeLessThanOrEqual(Date.now() + 30 * 86400000)
    if (environment === 'production') expect(String(res.headers['set-cookie'])).toContain('Secure')
    await app.close()
  })
  it('restores an old local session without checking its previous expiry, but still checks revocation', async () => {
    env.NODE_ENV = 'development'
    mockRefreshToken.findFirst.mockResolvedValue({
      id: 'refresh',
      userId: fakeUser.id,
      expiresAt: new Date(0),
    } as never)
    mockUser.findUnique.mockResolvedValue(fakeUser)
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: 'refreshToken=old-local-token' },
    })
    expect(res.statusCode).toBe(200)
    expect(mockRefreshToken.findFirst).toHaveBeenCalledWith({
      where: { token: 'old-local-token', revokedAt: null },
    })
    await app.close()
  })
})
