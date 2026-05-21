import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

import { prisma } from '../../lib/prisma.js'

import { fetchPageViews } from './viewsRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    page: { findFirst: vi.fn() },
    view: { aggregate: vi.fn() },
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
