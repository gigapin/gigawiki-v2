import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

import { prisma } from '../../lib/prisma.js'

import { fetchRevisions, fetchRevision, restoreRevision } from './revisionsRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    page: { findFirst: vi.fn(), update: vi.fn() },
    revision: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
  },
}))

const mockPage = vi.mocked(prisma.page)
const mockRevision = vi.mocked(prisma.revision)

function buildPublicApp() {
  const app = Fastify()
  app.register(fetchRevisions)
  app.register(fetchRevision)
  return app
}

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(restoreRevision)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakePage = {
  id: 'page-1',
  title: 'Introduction',
  slug: 'introduction',
  content: 'Hello world',
  position: 0,
  visibility: 'PUBLIC',
  isDraft: false,
  restricted: false,
  currentRevision: 2,
  sectionId: 'sec-1',
  projectId: 'proj-1',
  createdById: 'user-1',
  updatedById: 'user-1',
  ownedById: 'user-1',
  publishedAt: new Date(),
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const fakeRevision = {
  id: 'rev-1',
  pageId: 'page-1',
  projectId: 'proj-1',
  sectionId: 'sec-1',
  createdById: 'user-1',
  title: 'Introduction',
  content: 'Original content',
  slug: 'introduction',
  summary: null,
  revisionNumber: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /pages/:pageSlug/revisions', () => {
  it('returns paginated revision list without content', async () => {
    mockPage.findFirst.mockResolvedValue({ id: 'page-1' } as never)
    mockRevision.findMany.mockResolvedValue([
      {
        id: 'rev-1',
        revisionNumber: 0,
        title: 'Introduction',
        summary: null,
        createdAt: new Date(),
        createdBy: { id: 'user-1', name: 'Alice' },
      },
    ] as never)
    mockRevision.count.mockResolvedValue(1)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/introduction/revisions' })

    expect(res.statusCode).toBe(200)
    expect(res.json().revisions).toHaveLength(1)
    expect(res.json().total).toBe(1)
    expect(res.json().revisions[0]).not.toHaveProperty('content')
    expect(mockRevision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { revisionNumber: 'desc' } }),
    )
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/ghost/revisions' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Page not found' })
  })

  it('applies pagination params', async () => {
    mockPage.findFirst.mockResolvedValue({ id: 'page-1' } as never)
    mockRevision.findMany.mockResolvedValue([])
    mockRevision.count.mockResolvedValue(0)

    const app = buildPublicApp()
    await app.inject({ method: 'GET', url: '/pages/introduction/revisions?page=2&limit=5' })

    expect(mockRevision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    )
  })
})

describe('GET /pages/:pageSlug/revisions/:revisionNumber', () => {
  it('returns full revision including content', async () => {
    mockPage.findFirst.mockResolvedValue({ id: 'page-1' } as never)
    mockRevision.findFirst.mockResolvedValue({
      ...fakeRevision,
      createdBy: { id: 'user-1', name: 'Alice' },
    } as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/introduction/revisions/0' })

    expect(res.statusCode).toBe(200)
    expect(res.json().content).toBe('Original content')
    expect(res.json().revisionNumber).toBe(0)
    expect(mockRevision.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pageId: 'page-1', revisionNumber: 0 } }),
    )
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/ghost/revisions/0' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Page not found' })
  })

  it('returns 404 when revision does not exist', async () => {
    mockPage.findFirst.mockResolvedValue({ id: 'page-1' } as never)
    mockRevision.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/introduction/revisions/99' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Revision not found' })
  })
})

describe('POST /pages/:pageSlug/revisions/:revisionNumber/restore', () => {
  it('snapshots current page state and restores revision content', async () => {
    mockPage.findFirst.mockResolvedValue(fakePage as never)
    mockRevision.findFirst.mockResolvedValue(fakeRevision as never)
    mockRevision.create.mockResolvedValue({} as never)
    mockPage.update.mockResolvedValue({
      ...fakePage,
      content: 'Original content',
      currentRevision: 3,
    } as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/pages/introduction/revisions/0/restore',
    })

    expect(res.statusCode).toBe(200)
    expect(mockRevision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pageId: 'page-1',
          title: 'Introduction',
          content: 'Hello world',
          revisionNumber: 2,
          createdById: 'user-1',
        }),
      }),
    )
    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Introduction',
          content: 'Original content',
          currentRevision: 3,
          updatedById: 'user-1',
        }),
      }),
    )
  })

  it('regenerates slug when revision title differs from current title', async () => {
    const pageWithDifferentTitle = { ...fakePage, title: 'Old Title', slug: 'old-title' }
    const revisionWithNewTitle = { ...fakeRevision, title: 'New Title' }

    mockPage.findFirst.mockResolvedValue(pageWithDifferentTitle as never)
    mockRevision.findFirst.mockResolvedValue(revisionWithNewTitle as never)
    mockRevision.create.mockResolvedValue({} as never)
    mockPage.update.mockResolvedValue({
      ...fakePage,
      title: 'New Title',
      slug: 'new-title',
    } as never)

    const app = buildAuthApp('EDITOR')
    await app.inject({ method: 'POST', url: '/pages/old-title/revisions/0/restore' })

    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'new-title' }),
      }),
    )
  })

  it('keeps slug when title is unchanged', async () => {
    mockPage.findFirst.mockResolvedValue(fakePage as never)
    mockRevision.findFirst.mockResolvedValue(fakeRevision as never)
    mockRevision.create.mockResolvedValue({} as never)
    mockPage.update.mockResolvedValue(fakePage as never)

    const app = buildAuthApp('ADMIN')
    await app.inject({ method: 'POST', url: '/pages/introduction/revisions/0/restore' })

    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'introduction' }),
      }),
    )
  })

  it('returns 403 for GUEST role', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'POST',
      url: '/pages/introduction/revisions/0/restore',
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/pages/ghost/revisions/0/restore',
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Page not found' })
  })

  it('returns 404 when revision does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(fakePage as never)
    mockRevision.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/pages/introduction/revisions/99/restore',
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Revision not found' })
  })
})
