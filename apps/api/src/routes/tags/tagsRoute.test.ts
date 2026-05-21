import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

import { prisma } from '../../lib/prisma.js'

import { fetchTags, createTag, deleteTag } from './tagsRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const mockTag = vi.mocked(prisma.tag)

function buildPublicApp() {
  const app = Fastify()
  app.register(fetchTags)
  return app
}

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(createTag)
  app.register(deleteTag)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeTag = {
  id: 'tag-1',
  name: 'typescript',
  createdAt: new Date(),
}

describe('GET /tags', () => {
  it('returns empty array when no name query param', async () => {
    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/tags' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
    expect(mockTag.findMany).not.toHaveBeenCalled()
  })

  it('returns tags matching prefix', async () => {
    mockTag.findMany.mockResolvedValue([fakeTag] as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/tags?name=type' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
    expect(mockTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { startsWith: 'type' } },
        take: 20,
      }),
    )
  })
})

describe('POST /tags', () => {
  it('creates a tag for a page', async () => {
    mockTag.count.mockResolvedValue(0)
    mockTag.create.mockResolvedValue(fakeTag as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      payload: { name: 'TypeScript', pageId: 'page-1' },
    })

    expect(res.statusCode).toBe(201)
    expect(mockTag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'typescript', pageId: 'page-1', userId: 'user-1' }),
      }),
    )
  })

  it('normalizes tag name to lowercase', async () => {
    mockTag.count.mockResolvedValue(0)
    mockTag.create.mockResolvedValue({ ...fakeTag, name: 'react' } as never)

    const app = buildAuthApp('EDITOR')
    await app.inject({
      method: 'POST',
      url: '/tags',
      payload: { name: 'REACT', pageId: 'page-1' },
    })

    expect(mockTag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'react' }),
      }),
    )
  })

  it('returns 403 for GUEST', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      payload: { name: 'tag', pageId: 'page-1' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when no target provided', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      payload: { name: 'tag' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/exactly one/i)
  })

  it('returns 400 when multiple targets provided', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      payload: { name: 'tag', pageId: 'page-1', projectId: 'proj-1' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when 10 tags already exist for resource', async () => {
    mockTag.count.mockResolvedValue(10)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      payload: { name: 'tag', pageId: 'page-1' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/maximum 10/i)
  })
})

describe('DELETE /tags/:id', () => {
  it('allows owner to delete their tag', async () => {
    mockTag.findFirst.mockResolvedValue({ id: 'tag-1', userId: 'user-1' } as never)
    mockTag.delete.mockResolvedValue(fakeTag as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({ method: 'DELETE', url: '/tags/tag-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Tag deleted successfully' })
    expect(mockTag.delete).toHaveBeenCalledWith({ where: { id: 'tag-1' } })
  })

  it('allows admin to delete any tag', async () => {
    mockTag.findFirst.mockResolvedValue({ id: 'tag-1', userId: 'other-user' } as never)
    mockTag.delete.mockResolvedValue(fakeTag as never)

    const app = buildAuthApp('ADMIN', 'admin-1')
    const res = await app.inject({ method: 'DELETE', url: '/tags/tag-1' })

    expect(res.statusCode).toBe(200)
  })

  it('returns 403 for non-owner non-admin', async () => {
    mockTag.findFirst.mockResolvedValue({ id: 'tag-1', userId: 'other-user' } as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({ method: 'DELETE', url: '/tags/tag-1' })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when tag does not exist', async () => {
    mockTag.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/tags/ghost' })

    expect(res.statusCode).toBe(404)
  })
})
