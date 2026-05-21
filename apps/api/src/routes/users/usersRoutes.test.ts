import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { Role } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'

import {
  fetchAllUsers,
  fetchUser,
  updateUser,
  deleteUser,
  uploadAvatar,
  inviteUser,
} from './usersRoutes.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    image: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    emailInvite: {
      create: vi.fn(),
    },
  },
}))

vi.mock('argon2', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    argon2id: 2,
  },
}))

const mockPrismaUser = vi.mocked(prisma.user)
const mockPrismaEmailInvite = vi.mocked(prisma.emailInvite)

function buildApp(userRole: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.register(multipart)
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role: userRole }
    done()
  })
  app.register(fetchAllUsers)
  app.register(fetchUser)
  app.register(updateUser)
  app.register(deleteUser)
  app.register(uploadAvatar)
  app.register(inviteUser)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  slug: 'john-doe',
  role: Role.GUEST,
  avatarId: null,
  emailConfirmed: false,
  emailVerifiedAt: null,
  password: 'hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /users', () => {
  it('returns paginated users for admin', async () => {
    mockPrismaUser.findMany.mockResolvedValue([fakeUser])
    mockPrismaUser.count.mockResolvedValue(1)

    const app = buildApp('ADMIN')
    const res = await app.inject({ method: 'GET', url: '/users' })

    expect(res.statusCode).toBe(200)
    expect(res.json().users).toHaveLength(1)
    expect(res.json().total).toBe(1)
  })

  it('returns 403 for non-admin', async () => {
    const app = buildApp('GUEST')
    const res = await app.inject({ method: 'GET', url: '/users' })

    expect(res.statusCode).toBe(403)
  })

  it('filters by role', async () => {
    mockPrismaUser.findMany.mockResolvedValue([])
    mockPrismaUser.count.mockResolvedValue(0)

    const app = buildApp('ADMIN')
    await app.inject({ method: 'GET', url: '/users?role=EDITOR' })

    expect(mockPrismaUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'EDITOR' } }),
    )
  })
})

describe('GET /users/:id', () => {
  it('returns a user by id', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(fakeUser)

    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/users/user-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe('user-1')
  })

  it('resolves "me" to the authenticated user id', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(fakeUser)

    const app = buildApp('GUEST', 'user-1')
    await app.inject({ method: 'GET', url: '/users/me' })

    expect(mockPrismaUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    )
  })

  it('returns 404 when user does not exist', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)

    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/users/unknown' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'User not found' })
  })
})

describe('PATCH /users/:id', () => {
  it('updates own profile', async () => {
    const updated = { ...fakeUser, name: 'Jane Doe' }
    mockPrismaUser.update.mockResolvedValue(updated)

    const app = buildApp('GUEST', 'user-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/user-1',
      payload: { name: 'Jane Doe' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Jane Doe')
  })

  it('returns 403 when non-admin tries to update another user', async () => {
    const app = buildApp('GUEST', 'user-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/user-2',
      payload: { name: 'Hacker' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 when non-admin tries to change role', async () => {
    const app = buildApp('GUEST', 'user-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/user-1',
      payload: { role: 'ADMIN' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('allows admin to change another user role', async () => {
    const updated = { ...fakeUser, role: Role.EDITOR }
    mockPrismaUser.update.mockResolvedValue(updated)

    const app = buildApp('ADMIN', 'admin-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/user-1',
      payload: { role: 'EDITOR' },
    })

    expect(res.statusCode).toBe(200)
  })
})

describe('DELETE /users/:id', () => {
  it('deletes a user as admin', async () => {
    mockPrismaUser.delete.mockResolvedValue(fakeUser)

    const app = buildApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/users/user-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'User deleted successfully' })
  })

  it('returns 403 for non-admin', async () => {
    const app = buildApp('GUEST')
    const res = await app.inject({ method: 'DELETE', url: '/users/user-1' })

    expect(res.statusCode).toBe(403)
  })
})

describe('POST /users/invite', () => {
  it('creates an invite as admin', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)
    const fakeInvite = {
      id: 'invite-1',
      email: 'new@example.com',
      name: 'New User',
      role: Role.GUEST,
      sentById: 'admin-1',
      expiresAt: new Date(),
      token: 'tok',
      acceptedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockPrismaEmailInvite.create.mockResolvedValue(fakeInvite)

    const app = buildApp('ADMIN', 'admin-1')
    const res = await app.inject({
      method: 'POST',
      url: '/users/invite',
      payload: { email: 'new@example.com', name: 'New User' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().invite.email).toBe('new@example.com')
  })

  it('returns 409 when email is already registered', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(fakeUser)

    const app = buildApp('ADMIN')
    const res = await app.inject({
      method: 'POST',
      url: '/users/invite',
      payload: { email: 'john@example.com', name: 'John' },
    })

    expect(res.statusCode).toBe(409)
  })

  it('returns 403 for non-admin', async () => {
    const app = buildApp('GUEST')
    const res = await app.inject({
      method: 'POST',
      url: '/users/invite',
      payload: { email: 'new@example.com', name: 'New User' },
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('POST /users/:id/avatar', () => {
  it('returns 403 when non-admin tries to update another user avatar', async () => {
    const app = buildApp('GUEST', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/users/user-2/avatar',
      headers: { 'content-type': 'multipart/form-data; boundary=----boundary' },
      payload: '------boundary--',
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when no file is uploaded', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(fakeUser)

    const app = buildApp('ADMIN', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/users/user-1/avatar',
      headers: { 'content-type': 'multipart/form-data; boundary=----boundary' },
      payload: '------boundary--',
    })

    expect(res.statusCode).toBe(400)
  })
})
