import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

import { prisma } from '../../lib/prisma.js'

import { fetchFavorites, toggleFavorite } from './favoritesRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    favorite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const mockFavorite = vi.mocked(prisma.favorite)

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(fetchFavorites)
  app.register(toggleFavorite)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeFavorite = {
  id: 'fav-1',
  userId: 'user-1',
  pageId: 'page-1',
  projectId: null,
  sectionId: null,
  createdAt: new Date(),
  page: { id: 'page-1', title: 'Introduction', slug: 'introduction' },
  project: null,
  section: null,
}

describe('GET /favorites', () => {
  it('returns paginated favorites for the current user', async () => {
    mockFavorite.findMany.mockResolvedValue([fakeFavorite] as never)
    mockFavorite.count.mockResolvedValue(1)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({ method: 'GET', url: '/favorites' })

    expect(res.statusCode).toBe(200)
    expect(res.json().favorites).toHaveLength(1)
    expect(res.json().total).toBe(1)
    expect(mockFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' } }),
    )
  })

  it('applies pagination params', async () => {
    mockFavorite.findMany.mockResolvedValue([])
    mockFavorite.count.mockResolvedValue(0)

    const app = buildAuthApp()
    await app.inject({ method: 'GET', url: '/favorites?page=2&limit=5' })

    expect(mockFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    )
  })
})

describe('POST /favorites', () => {
  it('creates a favorite (toggle ON) for a page', async () => {
    mockFavorite.findUnique.mockResolvedValue(null)
    mockFavorite.create.mockResolvedValue(fakeFavorite as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/favorites',
      payload: { pageId: 'page-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ favorited: true })
    expect(mockFavorite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', pageId: 'page-1' }),
      }),
    )
  })

  it('removes a favorite (toggle OFF) when already exists', async () => {
    mockFavorite.findUnique.mockResolvedValue({ id: 'fav-1' } as never)
    mockFavorite.delete.mockResolvedValue(fakeFavorite as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/favorites',
      payload: { pageId: 'page-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ favorited: false })
    expect(mockFavorite.delete).toHaveBeenCalledWith({ where: { id: 'fav-1' } })
  })

  it('uses correct unique index for project', async () => {
    mockFavorite.findUnique.mockResolvedValue(null)
    mockFavorite.create.mockResolvedValue({
      ...fakeFavorite,
      pageId: null,
      projectId: 'proj-1',
    } as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/favorites',
      payload: { projectId: 'proj-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockFavorite.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_projectId: { userId: 'user-1', projectId: 'proj-1' } },
      }),
    )
  })

  it('returns 400 when no target provided', async () => {
    const app = buildAuthApp()
    const res = await app.inject({
      method: 'POST',
      url: '/favorites',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/exactly one/i)
  })

  it('returns 400 when multiple targets provided', async () => {
    const app = buildAuthApp()
    const res = await app.inject({
      method: 'POST',
      url: '/favorites',
      payload: { pageId: 'page-1', projectId: 'proj-1' },
    })

    expect(res.statusCode).toBe(400)
  })
})

it('keeps Guest favorites and their count scoped to the authenticated user', async () => {
  mockFavorite.findMany.mockResolvedValue([])
  mockFavorite.count.mockResolvedValue(0)
  const app = buildAuthApp('GUEST', 'guest-user')
  const res = await app.inject({ method: 'GET', url: '/favorites?userId=other-user' })
  expect(res.statusCode).toBe(200)
  expect(res.json().total).toBe(0)
  expect(mockFavorite.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { userId: 'guest-user' } }),
  )
  expect(mockFavorite.count).toHaveBeenCalledWith({ where: { userId: 'guest-user' } })
  await app.close()
})
