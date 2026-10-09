import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

import { prisma } from '../../lib/prisma.js'

import { fetchPageViews, fetchRecentViews } from './viewsRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    page: { findFirst: vi.fn() },
    view: { aggregate: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}))

const mockPage = vi.mocked(prisma.page)
const mockView = vi.mocked(prisma.view)

function buildPublicApp() {
  const app = Fastify()
  app.register(fetchPageViews)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /pages/:pageSlug/views', () => {
  it('returns total views and unique viewers', async () => {
    mockPage.findFirst.mockResolvedValue({ id: 'page-1' } as never)
    mockView.aggregate.mockResolvedValue({
      _sum: { count: 42 },
      _count: { userId: 10 },
    } as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/introduction/views' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ totalViews: 42, uniqueViewers: 10 })
    expect(mockView.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pageId: 'page-1' } }),
    )
  })

  it('returns 0 when count is null', async () => {
    mockPage.findFirst.mockResolvedValue({ id: 'page-1' } as never)
    mockView.aggregate.mockResolvedValue({
      _sum: { count: null },
      _count: { userId: 0 },
    } as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/new-page/views' })

    expect(res.statusCode).toBe(200)
    expect(res.json().totalViews).toBe(0)
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/ghost/views' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Page not found' })
  })
})

function buildHistoryApp(userId?: string) {
  const app = Fastify()
  if (userId) {
    app.decorateRequest('user', null as never)
    app.addHook('preHandler', (req, _reply, done) => {
      req.user = { id: userId, role: 'GUEST', email: 'guest@example.com' }
      done()
    })
  }
  app.register(fetchRecentViews)
  return app
}
describe('GET /views', () => {
  it('returns personal history newest first and cannot select another account', async () => {
    mockView.findMany.mockResolvedValue([
      {
        id: 'view',
        lastSeenAt: new Date(),
        page: { id: 'p', title: 'Welcome', slug: 'welcome' },
        project: null,
        section: null,
      },
    ] as never)
    mockView.count.mockResolvedValue(1)
    const app = buildHistoryApp('guest')
    const res = await app.inject({ method: 'GET', url: '/views?userId=admin&page=1&limit=6' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ total: 1, page: 1, limit: 6 })
    expect(mockView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'guest' }),
        orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 6,
      }),
    )
    const query = mockView.findMany.mock.calls[0][0]!
    expect(mockView.count).toHaveBeenCalledWith({ where: query.where })
    expect(query.select).not.toHaveProperty('user')
    expect(JSON.stringify(query.select)).not.toContain('content')
    await app.close()
  })
  it('excludes deleted resources and deleted ancestors for every target type', async () => {
    mockView.findMany.mockResolvedValue([])
    mockView.count.mockResolvedValue(0)
    const app = buildHistoryApp('guest')
    await app.inject({ method: 'GET', url: '/views' })
    const where = mockView.findMany.mock.calls[0][0]!.where!
    expect(where.OR).toEqual([
      {
        page: {
          is: {
            deletedAt: null,
            section: { deletedAt: null },
            project: { deletedAt: null, subject: { deletedAt: null } },
          },
        },
      },
      { project: { is: { deletedAt: null, subject: { deletedAt: null } } } },
      {
        section: {
          is: { deletedAt: null, project: { deletedAt: null, subject: { deletedAt: null } } },
        },
      },
    ])
    await app.close()
  })
  it('applies pagination and returns an empty history', async () => {
    mockView.findMany.mockResolvedValue([])
    mockView.count.mockResolvedValue(0)
    const app = buildHistoryApp('guest')
    const res = await app.inject({ method: 'GET', url: '/views?page=2&limit=6' })
    expect(res.json()).toEqual({ views: [], total: 0, page: 2, limit: 6 })
    expect(mockView.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 6, take: 6 }))
    await app.close()
  })
  it.each(['page=0', 'page=1.5', 'limit=101', 'limit=invalid'])(
    'rejects invalid pagination %s',
    async (query) => {
      const app = buildHistoryApp('guest')
      expect((await app.inject({ method: 'GET', url: `/views?${query}` })).statusCode).toBe(400)
      expect(mockView.findMany).not.toHaveBeenCalled()
      await app.close()
    },
  )
  it('requires an authenticated account', async () => {
    const app = buildHistoryApp()
    expect((await app.inject({ method: 'GET', url: '/views' })).statusCode).toBe(401)
    expect(mockView.findMany).not.toHaveBeenCalled()
    await app.close()
  })
})
