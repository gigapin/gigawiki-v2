import { describe, it, expect, vi, beforeEach, test } from 'vitest'
import Fastify from 'fastify'
import { Role } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'

import { createUser, fetchUser, fetchAllUsers, updateUser, deleteUser } from './usersRoutes.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

function buildApp() {
  const app = Fastify()
  app.register(createUser)
  app.register(fetchUser)
  app.register(fetchAllUsers)
  app.register(updateUser)
  app.register(deleteUser)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashed_password',
  emailVerifiedAt: null,
  emailConfirmed: false,
  slug: 'john-doe',
  role: Role.GUEST,
  avatarId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('POST /users/create', () => {
  it('creates a user and returns 201', async () => {
    mockPrismaUser.create.mockResolvedValue(fakeUser)

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/users/create',
      payload: { name: 'John Doe', email: 'john@example.com', password: 'secret' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ email: 'john@example.com', name: 'John Doe' })
    expect(mockPrismaUser.create).toHaveBeenCalledOnce()
  })

  test('returns 409 when email is already in use', async () => {
    mockPrismaUser.create.mockRejectedValue({ code: 'P2002' })

    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/users/create',
      payload: { name: 'John Doe', email: 'john@example.com', password: 'secret' },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ error: 'Email already in use' })
  })
})

describe('GET /users/:id', () => {
  it('returns a user when found', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(fakeUser)

    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/users/user-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: 'user-1' })
  })

  it('returns 404 when user does not exist', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)

    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/users/unknown' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'User not found' })
  })
})

describe('GET /users', () => {
  it('returns all users', async () => {
    mockPrismaUser.findMany.mockResolvedValue([fakeUser])

    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/users' })

    expect(res.statusCode).toBe(200)
    expect(res.json().users).toHaveLength(1)
  })
})

describe('PUT /users/:id/edit', () => {
  it('updates a user and returns 200', async () => {
    const updated = { ...fakeUser, name: 'Jane Doe' }
    mockPrismaUser.update.mockResolvedValue(updated)

    const app = buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/users/user-1/edit',
      payload: { name: 'Jane Doe' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.name).toBe('Jane Doe')
  })
})

describe('DELETE /users/:id/delete', () => {
  it('deletes a user and returns 201', async () => {
    mockPrismaUser.delete.mockResolvedValue(fakeUser)

    const app = buildApp()
    const res = await app.inject({ method: 'DELETE', url: '/users/user-1/delete' })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ message: 'User deleted successfully' })
  })
})
