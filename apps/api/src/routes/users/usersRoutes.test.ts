import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import { Role } from '@prisma/client'

import { emailQueue } from '../../lib/queue.js'
import { prisma } from '../../lib/prisma.js'

import {
  fetchAllUsers,
  fetchMentionUsers,
  fetchUser,
  updateUser,
  deleteUser,
  uploadAvatar,
  inviteUser,
} from './usersRoutes.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    refreshToken: { updateMany: vi.fn() },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    image: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    emailInvite: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('../../lib/queue.js', () => ({ emailQueue: { add: vi.fn().mockResolvedValue(undefined) } }))
vi.mock('../../config/env.js', () => ({
  env: { FRONTEND_URL: 'http://localhost:5173', API_URL: 'http://localhost:3001' },
}))

vi.mock('../../lib/storage.js', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))
vi.mock('../../lib/verification-email.js', () => ({ queueVerificationEmail: vi.fn() }))

vi.mock('argon2', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    argon2id: 2,
    verify: vi.fn().mockResolvedValue(true),
  },
}))

const mockPrismaUser = vi.mocked(prisma.user)
const mockPrismaEmailInvite = vi.mocked(prisma.emailInvite)

function buildApp(userRole: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.register(multipart)
  app.register(cookie)
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role: userRole }
    done()
  })
  app.register(fetchAllUsers)
  app.register(fetchMentionUsers)
  app.register(fetchUser)
  app.register(updateUser)
  app.register(deleteUser)
  app.register(uploadAvatar)
  app.register(inviteUser)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation((async (
    callback: (tx: typeof prisma) => unknown,
  ) => callback(prisma)) as never)
  vi.mocked(prisma.emailInvite.findUnique).mockResolvedValue(null)
  mockPrismaUser.findUnique.mockResolvedValue(fakeUser)
  mockPrismaUser.updateMany.mockResolvedValue({ count: 1 })
})

const fakeUser = {
  authVersion: 0,
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
    mockPrismaUser.findUnique
      .mockResolvedValueOnce({ ...fakeUser, id: 'admin-1', role: 'ADMIN' })
      .mockResolvedValueOnce(fakeUser)

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
  it('requires a reviewed deletion preview', async () => {
    const app = buildApp('ADMIN', 'admin-1')
    const res = await app.inject({ method: 'DELETE', url: '/users/user-1' })
    expect(res.statusCode).toBe(400)
    expect(mockPrismaUser.delete).not.toHaveBeenCalled()
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
      payload: { email: 'new@example.com' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().invite.email).toBe('new@example.com')
    expect(mockPrismaEmailInvite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'new@example.com', name: '', role: 'GUEST' }),
    })
    expect(vi.mocked(emailQueue.add).mock.calls[0][1]).toEqual(
      expect.objectContaining({ data: expect.not.objectContaining({ name: expect.any(String) }) }),
    )
    expect(emailQueue.add).toHaveBeenCalledWith(
      'invite',
      expect.objectContaining({
        template: 'invite',
        to: 'new@example.com',
        data: expect.objectContaining({
          acceptUrl: 'http://localhost:5173/accept-invite?token=tok',
          role: 'GUEST',
        }),
      }),
    )
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
      payload: { email: 'new@example.com' },
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

describe('GET /users/mentions', () => {
  it.each(['ADMIN', 'EDITOR', 'GUEST'])('provides a minimal directory for %s', async (role) => {
    mockPrismaUser.findMany.mockResolvedValue([])
    const app = buildApp(role)
    const response = await app.inject({ method: 'GET', url: '/users/mentions?search=Al' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ users: [] })
    expect(mockPrismaUser.findMany).toHaveBeenCalledWith({
      where: { name: { contains: 'Al', mode: 'insensitive' } },
      select: { id: true, name: true },
      take: 8,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    })
    await app.close()
  })
})

it('reports a saved invitation separately when email delivery cannot be queued', async () => {
  mockPrismaUser.findUnique.mockResolvedValue(null)
  mockPrismaEmailInvite.create.mockResolvedValue({
    token: 'tok',
    expiresAt: new Date(Date.now() + 86400000),
  } as never)
  vi.mocked(emailQueue.add).mockRejectedValueOnce(new Error('offline'))
  const app = buildApp('ADMIN')
  const res = await app.inject({
    method: 'POST',
    url: '/users/invite',
    payload: { email: 'alice@example.com' },
  })
  expect(res.statusCode).toBe(503)
  expect(res.json().code).toBe('INVITE_DELIVERY_FAILED')
  expect(mockPrismaEmailInvite.create).toHaveBeenCalledTimes(1)
  await app.close()
})
it('rejects malformed invitations before saving or queuing them', async () => {
  const app = buildApp('ADMIN')
  const res = await app.inject({
    method: 'POST',
    url: '/users/invite',
    payload: { name: ' ', email: 'invalid', role: 'SUPERUSER' },
  })
  expect(res.statusCode).toBe(400)
  expect(mockPrismaEmailInvite.create).not.toHaveBeenCalled()
  expect(emailQueue.add).not.toHaveBeenCalled()
  await app.close()
})

it('validates profile fields before writing', async () => {
  const app = buildApp('GUEST')
  for (const payload of [{ name: ' ' }, { email: 'invalid' }, { unexpected: true }]) {
    const result = await app.inject({ method: 'PATCH', url: '/users/me', payload })
    expect(result.statusCode).toBe(400)
  }
  expect(mockPrismaUser.update).not.toHaveBeenCalled()
  await app.close()
})
it('normalizes a changed email and requires verification', async () => {
  const { queueVerificationEmail } = await import('../../lib/verification-email.js')
  mockPrismaUser.findUnique.mockResolvedValueOnce(fakeUser).mockResolvedValueOnce(null)
  mockPrismaUser.update.mockResolvedValue({ ...fakeUser, email: 'new@example.com' })
  const app = buildApp('GUEST')
  const result = await app.inject({
    method: 'PATCH',
    url: '/users/me',
    payload: { email: ' NEW@Example.com ' },
  })
  expect(result.statusCode).toBe(200)
  expect(mockPrismaUser.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: { email: 'new@example.com', emailConfirmed: false, emailVerifiedAt: null },
    }),
  )
  expect(queueVerificationEmail).toHaveBeenCalled()
  await app.close()
})
it('preserves verification when the email stays the same', async () => {
  const { queueVerificationEmail } = await import('../../lib/verification-email.js')
  mockPrismaUser.findUnique.mockResolvedValue(fakeUser)
  mockPrismaUser.update.mockResolvedValue(fakeUser)
  const app = buildApp('GUEST')
  await app.inject({ method: 'PATCH', url: '/users/me', payload: { email: fakeUser.email } })
  expect(mockPrismaUser.update).toHaveBeenCalledWith(expect.objectContaining({ data: {} }))
  expect(queueVerificationEmail).not.toHaveBeenCalled()
  await app.close()
})
it('rejects an email already belonging to another account', async () => {
  mockPrismaUser.findUnique
    .mockResolvedValueOnce(fakeUser)
    .mockResolvedValueOnce({ ...fakeUser, id: 'other' })
  const app = buildApp('GUEST')
  const result = await app.inject({
    method: 'PATCH',
    url: '/users/me',
    payload: { email: 'other@example.com' },
  })
  expect(result.statusCode).toBe(409)
  expect(mockPrismaUser.update).not.toHaveBeenCalled()
  await app.close()
})
it('returns the saved profile when verification delivery fails', async () => {
  const { queueVerificationEmail } = await import('../../lib/verification-email.js')
  vi.mocked(queueVerificationEmail).mockRejectedValueOnce(new Error('offline'))
  mockPrismaUser.findUnique.mockResolvedValueOnce(fakeUser).mockResolvedValueOnce(null)
  mockPrismaUser.update.mockResolvedValue({ ...fakeUser, email: 'new@example.com' })
  const app = buildApp('GUEST')
  const result = await app.inject({
    method: 'PATCH',
    url: '/users/me',
    payload: { email: 'new@example.com' },
  })
  expect(result.statusCode).toBe(200)
  expect(result.json().verificationDeliveryFailed).toBe(true)
  await app.close()
})
it('uploads a real avatar for a Guest before linking the image', async () => {
  const sharp = (await import('sharp')).default
  const { uploadFile } = await import('../../lib/storage.js')
  const buffer = await sharp({
    create: { width: 2, height: 2, channels: 3, background: '#ff0000' },
  })
    .png()
    .toBuffer()
  mockPrismaUser.findUnique.mockResolvedValue(fakeUser)
  vi.mocked(prisma.image.create).mockResolvedValue({ id: 'avatar' } as never)
  mockPrismaUser.update.mockResolvedValue({ ...fakeUser, avatarId: 'avatar' })
  const app = buildApp('GUEST')
  const result = await app.inject({
    method: 'POST',
    url: '/users/me/avatar',
    headers: { 'content-type': 'multipart/form-data; boundary=avatar-test' },
    payload: Buffer.concat([
      Buffer.from(
        '--avatar-test\r\nContent-Disposition: form-data; name="file"; filename="avatar.png"\r\nContent-Type: image/png\r\n\r\n',
      ),
      buffer,
      Buffer.from('\r\n--avatar-test--\r\n'),
    ]),
  })
  expect(result.statusCode).toBe(200)
  expect(uploadFile).toHaveBeenCalledWith(
    expect.stringContaining('/avatars/'),
    expect.any(Buffer),
    'image/webp',
  )
  expect(mockPrismaUser.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: { avatarId: 'avatar' } }),
  )
  await app.close()
})

it('changes own password, revokes refresh tokens and increments the session version', async () => {
  const app = buildApp('GUEST')
  const result = await app.inject({
    method: 'PATCH',
    url: '/users/me',
    payload: { currentPassword: 'oldpassword', newPassword: 'newpassword' },
  })
  expect(result.statusCode).toBe(200)
  expect(prisma.user.updateMany).toHaveBeenCalledWith({
    where: { id: 'user-1', password: 'hashed', authVersion: 0 },
    data: { password: 'hashed_password', authVersion: { increment: 1 } },
  })
  expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { userId: 'user-1', revokedAt: null } }),
  )
  expect(result.headers['set-cookie']).toBeTruthy()
  await app.close()
})
it('rejects password updates without the current password or through the legacy field', async () => {
  const app = buildApp('GUEST')
  for (const payload of [
    { password: 'newpassword' },
    { newPassword: 'newpassword' },
    { currentPassword: 'oldpassword', newPassword: 'newpassword', name: 'Changed' },
  ]) {
    expect((await app.inject({ method: 'PATCH', url: '/users/me', payload })).statusCode).toBe(400)
  }
  expect(prisma.user.updateMany).not.toHaveBeenCalled()
  await app.close()
})
it('rejects an incorrect current password', async () => {
  const argon2 = (await import('argon2')).default
  vi.mocked(argon2.verify).mockResolvedValueOnce(false)
  const app = buildApp('GUEST')
  const result = await app.inject({
    method: 'PATCH',
    url: '/users/me',
    payload: { currentPassword: 'wrongpassword', newPassword: 'newpassword' },
  })
  expect(result.statusCode).toBe(400)
  expect(prisma.user.updateMany).not.toHaveBeenCalled()
  await app.close()
})
it('prevents demoting the last administrator', async () => {
  mockPrismaUser.findUnique.mockResolvedValue({ ...fakeUser, role: 'ADMIN' })
  mockPrismaUser.count.mockResolvedValue(1)
  const app = buildApp('ADMIN')
  const result = await app.inject({ method: 'PATCH', url: '/users/me', payload: { role: 'GUEST' } })
  expect(result.statusCode).toBe(409)
  expect(prisma.user.update).not.toHaveBeenCalled()
  await app.close()
})

it('allows inviting a deleted account again without reusing its old token', async () => {
  mockPrismaUser.findUnique.mockResolvedValue(null)
  vi.mocked(prisma.emailInvite.findUnique).mockResolvedValue({
    id: 'old-invite',
    email: 'deleted@example.com',
    token: 'old-token',
    acceptedAt: new Date(),
    expiresAt: new Date(0),
  } as never)
  vi.mocked(prisma.emailInvite.updateMany).mockResolvedValue({ count: 1 })
  const app = buildApp('ADMIN')
  const result = await app.inject({
    method: 'POST',
    url: '/users/invite',
    payload: { email: 'deleted@example.com', role: 'GUEST' },
  })
  expect(result.statusCode).toBe(201)
  expect(result.json().invite.token).not.toBe('old-token')
  expect(result.json().invite.acceptedAt).toBeNull()
  expect(prisma.emailInvite.create).not.toHaveBeenCalled()
  await app.close()
})
