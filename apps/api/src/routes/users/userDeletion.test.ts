import { beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import type { Prisma } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'
import { adminTransaction } from '../../lib/admin-transaction.js'

import {
  buildDeletionPreview,
  executeUserDeletion,
  deletionPreview,
  deleteUser,
} from './userDeletion.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: Object.fromEntries([
    ...[
      'user',
      'project',
      'subject',
      'page',
      'revision',
      'comment',
      'tag',
      'image',
      'emailInvite',
      'refreshToken',
    ].map((name) => [
      name,
      {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
        delete: vi.fn(),
      },
    ]),
    ['$transaction', vi.fn()],
  ]),
}))
const target = {
  id: 'target',
  name: 'Target',
  email: 'target@example.com',
  role: 'GUEST',
  updatedAt: new Date(0),
}
const tx = prisma as unknown as Prisma.TransactionClient
beforeEach(() => {
  vi.resetAllMocks()
  for (const name of [
    'user',
    'project',
    'subject',
    'page',
    'revision',
    'comment',
    'tag',
    'image',
    'emailInvite',
    'refreshToken',
  ] as const) {
    const table = prisma[name] as unknown as {
      findMany: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
      deleteMany: ReturnType<typeof vi.fn>
    }
    table.findMany.mockResolvedValue([])
    table.updateMany.mockResolvedValue({ count: 1 })
    table.deleteMany.mockResolvedValue({ count: 1 })
  }
  vi.mocked(prisma.user.findUnique).mockImplementation((async ({
    where,
  }: {
    where: { id: string }
  }) => (where.id === 'admin' ? { ...target, id: 'admin', role: 'ADMIN' } : target)) as never)
  vi.mocked(prisma.user.count).mockResolvedValue(2)
  vi.mocked(prisma.$transaction).mockImplementation((async (
    callback: (tx: Prisma.TransactionClient) => unknown,
  ) => callback(tx)) as never)
})
function graph() {
  vi.mocked(prisma.project.findMany).mockResolvedValue([
    {
      id: 'mixed',
      userId: 'target',
      subjectId: 's-mixed',
      updatedAt: new Date(0),
      pages: [
        { id: 'own', createdById: 'target', updatedAt: new Date(0) },
        { id: 'other', createdById: 'other', updatedAt: new Date(0) },
      ],
      comments: [],
      tags: [],
      sections: [],
    },
    {
      id: 'empty',
      userId: 'target',
      subjectId: 's-empty',
      updatedAt: new Date(0),
      pages: [],
      comments: [],
      tags: [],
      sections: [],
    },
    {
      id: 'other-project',
      userId: 'other',
      subjectId: 's-other-project',
      updatedAt: new Date(0),
      pages: [],
      comments: [],
      tags: [],
      sections: [],
    },
  ] as never)
  vi.mocked(prisma.subject.findMany).mockResolvedValue([
    { id: 's-mixed' },
    { id: 's-empty' },
    { id: 's-other-project' },
  ] as never)
  vi.mocked(prisma.page.findMany).mockResolvedValue([
    { id: 'own', createdById: 'target', ownedById: 'target', updatedById: 'target' },
    { id: 'other', createdById: 'other', ownedById: 'target', updatedById: 'target' },
  ] as never)
  vi.mocked(prisma.comment.findMany).mockResolvedValue([
    { id: 'root', userId: 'target', parentId: null, pageId: 'other' },
    { id: 'reply', userId: 'other', parentId: 'root', pageId: 'other' },
  ] as never)
}
describe('User deletion graph', () => {
  it('previews own pages and empty containers, while preserving others', async () => {
    graph()
    const preview = await buildDeletionPreview(tx, 'target')
    expect(preview.ids).toEqual({
      deletedPages: ['own'],
      deletedProjects: ['empty'],
      deletedSubjects: ['s-empty'],
      transferredProjects: ['mixed'],
      transferredSubjects: ['s-mixed', 's-other-project'],
      promotedReplies: ['reply'],
    })
    expect(preview.counts.transferredPages).toBe(1)
    expect(preview.counts.comments).toBe(1)
  })
  it('promotes other replies, transfers ownership and deletes only reviewed pages', async () => {
    graph()
    const preview = await buildDeletionPreview(tx, 'target')
    await executeUserDeletion(tx, 'target', 'admin', preview.fingerprint)
    expect(prisma.comment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['reply'] } },
      data: { parentId: null },
    })
    expect(prisma.page.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['own'] } } })
    expect(prisma.project.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['empty'] } } })
    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: { ownedById: 'target' },
      data: { ownedById: 'admin' },
    })
    expect(prisma.image.updateMany).toHaveBeenCalledWith({
      where: { createdById: 'target' },
      data: { createdById: 'admin' },
    })
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'target' } })
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'target' } })
  })
  it('requires a new confirmation when resources change without changing their count', async () => {
    const preview = await buildDeletionPreview(tx, 'target')
    vi.mocked(prisma.user.findUnique).mockImplementation((async ({
      where,
    }: {
      where: { id: string }
    }) =>
      where.id === 'admin'
        ? { ...target, id: 'admin', role: 'ADMIN' }
        : { ...target, updatedAt: new Date(1) }) as never)
    await expect(
      executeUserDeletion(tx, 'target', 'admin', preview.fingerprint),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(prisma.user.delete).not.toHaveBeenCalled()
  })
  it('preserves containers with comments or tags belonging to another user', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        id: 'p',
        userId: 'target',
        subjectId: 's',
        pages: [],
        comments: [{ id: 'c', userId: 'other' }],
        tags: [],
        sections: [],
      },
    ] as never)
    const preview = await buildDeletionPreview(tx, 'target')
    expect(preview.ids.deletedProjects).toEqual([])
    expect(preview.ids.transferredProjects).toEqual(['p'])
  })
  it('rejects self deletion and deleting the last Admin', async () => {
    await expect(executeUserDeletion(tx, 'admin', 'admin', 'x')).rejects.toMatchObject({
      statusCode: 409,
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...target, role: 'ADMIN' } as never)
    vi.mocked(prisma.user.count).mockResolvedValue(1)
    await expect(executeUserDeletion(tx, 'target', 'admin', 'x')).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(prisma.user.delete).not.toHaveBeenCalled()
  })
  it('retries serialization conflicts and uses Serializable isolation', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce({ code: 'P2034' })
    await adminTransaction(async () => 'done')
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
    expect(prisma.$transaction).toHaveBeenLastCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
      timeout: 20000,
    })
  })
  it('limits previews and deletion to administrators and does not expose internal IDs', async () => {
    for (const role of ['GUEST', 'ADMIN']) {
      const app = Fastify()
      app.addHook('preHandler', async (req) => {
        req.user = { id: 'admin', email: 'admin@example.com', role }
      })
      app.register(deletionPreview)
      app.register(deleteUser)
      const res = await app.inject({ method: 'GET', url: '/users/target/deletion-preview' })
      expect(res.statusCode).toBe(role === 'ADMIN' ? 200 : 403)
      if (role === 'ADMIN') expect(res.json()).not.toHaveProperty('ids')
      const deleted = await app.inject({
        method: 'DELETE',
        url: '/users/target',
        payload: { fingerprint: res.json().fingerprint ?? 'a'.repeat(64) },
      })
      expect(deleted.statusCode).toBe(role === 'ADMIN' ? 200 : 403)
      await app.close()
    }
  })
})
