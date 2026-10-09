import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { Visibility } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'

import {
  fetchPagesBySection,
  fetchPage,
  createPage,
  replacePage,
  updatePage,
  deletePage,
  searchPages,
} from './pagesRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    section: { findFirst: vi.fn() },
    page: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    revision: { create: vi.fn() },
    view: { upsert: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

const mockSection = vi.mocked(prisma.section)
const mockPage = vi.mocked(prisma.page)
const mockRevision = vi.mocked(prisma.revision)
const mockQueryRaw = vi.mocked(prisma.$queryRaw)

function buildPublicApp() {
  const app = Fastify()
  app.register(fetchPagesBySection)
  app.register(fetchPage)
  return app
}

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(createPage)
  app.register(replacePage)
  app.register(updatePage)
  app.register(deletePage)
  app.register(searchPages)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  // slug helper looks up the candidate slug; free unless a test says otherwise
  mockPage.findUnique.mockResolvedValue(null)
})

const fakePage = {
  id: 'page-1',
  title: 'Introduction',
  slug: 'introduction',
  content: 'Hello world',
  position: 0,
  visibility: Visibility.PUBLIC,
  isDraft: false,
  restricted: false,
  currentRevision: 0,
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

describe('GET /sections/:sectionSlug/pages', () => {
  it('returns paginated pages for a section without content', async () => {
    mockSection.findFirst.mockResolvedValue({ id: 'sec-1' } as never)
    mockPage.findMany.mockResolvedValue([fakePage] as never)
    mockPage.count.mockResolvedValue(1)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/sections/intro/pages' })

    expect(res.statusCode).toBe(200)
    expect(res.json().pages).toHaveLength(1)
    expect(res.json().total).toBe(1)
    expect(mockPage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { position: 'asc' } }),
    )
  })

  it('returns 404 when section does not exist', async () => {
    mockSection.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/sections/ghost/pages' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Section not found' })
  })

  it('filters by isDraft when provided', async () => {
    mockSection.findFirst.mockResolvedValue({ id: 'sec-1' } as never)
    mockPage.findMany.mockResolvedValue([])
    mockPage.count.mockResolvedValue(0)

    const app = buildPublicApp()
    await app.inject({ method: 'GET', url: '/sections/intro/pages?isDraft=true' })

    expect(mockPage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isDraft: true }) }),
    )
  })

  it('applies pagination params', async () => {
    mockSection.findFirst.mockResolvedValue({ id: 'sec-1' } as never)
    mockPage.findMany.mockResolvedValue([])
    mockPage.count.mockResolvedValue(0)

    const app = buildPublicApp()
    await app.inject({ method: 'GET', url: '/sections/intro/pages?page=2&limit=5' })

    expect(mockPage.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }))
  })
})

describe('GET /pages/:slug', () => {
  it('returns full page with relations', async () => {
    const fullPage = {
      ...fakePage,
      createdBy: { id: 'user-1', name: 'Alice', slug: 'alice' },
      updatedBy: { id: 'user-1', name: 'Alice', slug: 'alice' },
      tags: [],
      _count: { comments: 2, favorites: 1 },
    }
    mockPage.findFirst.mockResolvedValue(fullPage as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/introduction' })

    expect(res.statusCode).toBe(200)
    expect(res.json().slug).toBe('introduction')
    expect(res.json()._count.comments).toBe(2)
  })

  it('returns only the requester favorite state without exposing favorite records', async () => {
    mockPage.findFirst.mockResolvedValue({ ...fakePage, favorites: [{ id: 'fav' }] } as never)
    const app = Fastify()
    app.decorateRequest('user', null as never)
    app.addHook('preHandler', (req, _reply, done) => {
      req.user = { id: 'reader', email: 'reader@example.com', role: 'GUEST' }
      done()
    })
    app.register(fetchPage)
    const res = await app.inject({ method: 'GET', url: '/pages/introduction' })
    expect(res.json().favorited).toBe(true)
    expect(res.json().favorites).toBeUndefined()
    expect(mockPage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          favorites: { where: { userId: 'reader' }, select: { id: true } },
          _count: { select: { comments: true, favorites: { where: { userId: 'reader' } } } },
        }),
      }),
    )
    await app.close()
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/missing' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Page not found' })
  })
})

describe('POST /pages', () => {
  it('creates a page with auto-generated slug and position', async () => {
    mockSection.findFirst.mockResolvedValue({ projectId: 'proj-1' } as never)
    mockPage.aggregate.mockResolvedValue({ _max: { position: 1 } } as never)
    mockPage.create.mockResolvedValue(fakePage as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/pages',
      payload: { title: 'Introduction', content: 'Hello', sectionId: 'sec-1' },
    })

    expect(res.statusCode).toBe(201)
    expect(mockPage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'introduction',
          position: 2,
          currentRevision: 0,
          createdById: 'user-1',
          updatedById: 'user-1',
          ownedById: 'user-1',
        }),
      }),
    )
  })

  it('defaults position to 0 when no pages exist yet', async () => {
    mockSection.findFirst.mockResolvedValue({ projectId: 'proj-1' } as never)
    mockPage.aggregate.mockResolvedValue({ _max: { position: null } } as never)
    mockPage.create.mockResolvedValue(fakePage as never)

    const app = buildAuthApp('EDITOR')
    await app.inject({
      method: 'POST',
      url: '/pages',
      payload: { title: 'Introduction', content: 'Hello', sectionId: 'sec-1' },
    })

    expect(mockPage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 0 }) }),
    )
  })

  it('sets publishedAt when isDraft is false', async () => {
    mockSection.findFirst.mockResolvedValue({ projectId: 'proj-1' } as never)
    mockPage.aggregate.mockResolvedValue({ _max: { position: null } } as never)
    mockPage.create.mockResolvedValue(fakePage as never)

    const app = buildAuthApp('EDITOR')
    await app.inject({
      method: 'POST',
      url: '/pages',
      payload: { title: 'Introduction', content: 'Hello', sectionId: 'sec-1', isDraft: false },
    })

    expect(mockPage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publishedAt: expect.any(Date) }),
      }),
    )
  })

  it('sets publishedAt to null when isDraft is true', async () => {
    mockSection.findFirst.mockResolvedValue({ projectId: 'proj-1' } as never)
    mockPage.aggregate.mockResolvedValue({ _max: { position: null } } as never)
    mockPage.create.mockResolvedValue({ ...fakePage, isDraft: true, publishedAt: null } as never)

    const app = buildAuthApp('EDITOR')
    await app.inject({
      method: 'POST',
      url: '/pages',
      payload: { title: 'Introduction', content: 'Hello', sectionId: 'sec-1', isDraft: true },
    })

    expect(mockPage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publishedAt: null }),
      }),
    )
  })

  it('returns 403 for GUEST role', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'POST',
      url: '/pages',
      payload: { title: 'Introduction', content: 'Hello', sectionId: 'sec-1' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when section does not exist', async () => {
    mockSection.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/pages',
      payload: { title: 'Introduction', content: 'Hello', sectionId: 'bad-id' },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('PUT /pages/:slug', () => {
  it('creates a revision snapshot and increments currentRevision', async () => {
    mockPage.findFirst.mockResolvedValue(fakePage as never)
    mockRevision.create.mockResolvedValue({} as never)
    mockPage.update.mockResolvedValue({ ...fakePage, currentRevision: 1 } as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'PUT',
      url: '/pages/introduction',
      payload: { title: 'Introduction', content: 'Updated content' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockRevision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pageId: 'page-1',
          title: 'Introduction',
          content: 'Hello world',
          revisionNumber: 0,
        }),
      }),
    )
    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentRevision: 1 }),
      }),
    )
  })

  it('regenerates slug when title changes', async () => {
    mockPage.findFirst.mockResolvedValue(fakePage as never)
    mockRevision.create.mockResolvedValue({} as never)
    mockPage.update.mockResolvedValue({
      ...fakePage,
      title: 'New Title',
      slug: 'new-title',
    } as never)

    const app = buildAuthApp('EDITOR')
    await app.inject({
      method: 'PUT',
      url: '/pages/introduction',
      payload: { title: 'New Title', content: 'Content' },
    })

    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'new-title' }),
      }),
    )
  })

  it('keeps slug when title is unchanged', async () => {
    mockPage.findFirst.mockResolvedValue(fakePage as never)
    mockRevision.create.mockResolvedValue({} as never)
    mockPage.update.mockResolvedValue(fakePage as never)

    const app = buildAuthApp('EDITOR')
    await app.inject({
      method: 'PUT',
      url: '/pages/introduction',
      payload: { title: 'Introduction', content: 'New content' },
    })

    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'introduction' }),
      }),
    )
  })

  it('returns 403 for GUEST role', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'PUT',
      url: '/pages/introduction',
      payload: { title: 'Introduction', content: 'Content' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'PUT',
      url: '/pages/ghost',
      payload: { title: 'Ghost', content: 'Content' },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /pages/:slug', () => {
  it('creates revision when content changes', async () => {
    mockPage.findFirst.mockResolvedValue(fakePage as never)
    mockRevision.create.mockResolvedValue({} as never)
    mockPage.update.mockResolvedValue({ ...fakePage, currentRevision: 1 } as never)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'PATCH',
      url: '/pages/introduction',
      payload: { content: 'Different content' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockRevision.create).toHaveBeenCalledOnce()
    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentRevision: 1 }),
      }),
    )
  })

  it('does not create revision when content is unchanged', async () => {
    mockPage.findFirst.mockResolvedValue(fakePage as never)
    mockPage.update.mockResolvedValue(fakePage as never)

    const app = buildAuthApp('EDITOR')
    await app.inject({
      method: 'PATCH',
      url: '/pages/introduction',
      payload: { isDraft: true },
    })

    expect(mockRevision.create).not.toHaveBeenCalled()
  })

  it('sets publishedAt when toggling isDraft from true to false', async () => {
    const draftPage = { ...fakePage, isDraft: true, publishedAt: null }
    mockPage.findFirst.mockResolvedValue(draftPage as never)
    mockPage.update.mockResolvedValue({ ...draftPage, isDraft: false } as never)

    const app = buildAuthApp('EDITOR')
    await app.inject({
      method: 'PATCH',
      url: '/pages/introduction',
      payload: { isDraft: false },
    })

    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publishedAt: expect.any(Date) }),
      }),
    )
  })

  it('returns 403 for GUEST role', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'PATCH',
      url: '/pages/introduction',
      payload: { isDraft: false },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'PATCH',
      url: '/pages/ghost',
      payload: { isDraft: false },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /pages/:slug', () => {
  it('soft-deletes a page as admin', async () => {
    mockPage.findFirst.mockResolvedValue({ id: 'page-1' } as never)
    mockPage.update.mockResolvedValue({ ...fakePage, deletedAt: new Date() } as never)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/pages/introduction' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Page deleted successfully' })
    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    )
  })

  it('returns 403 for non-admin', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({ method: 'DELETE', url: '/pages/introduction' })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/pages/ghost' })

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /search', () => {
  it('returns search results', async () => {
    const fakeResults = [
      {
        id: 'page-1',
        title: 'Introduction',
        slug: 'introduction',
        sectionId: 'sec-1',
        projectId: 'proj-1',
        rank: 0.5,
      },
    ]
    mockQueryRaw.mockResolvedValue(fakeResults as never)

    const app = buildAuthApp()
    const res = await app.inject({ method: 'GET', url: '/search?q=introduction' })

    expect(res.statusCode).toBe(200)
    expect(res.json().results).toHaveLength(1)
    expect(mockQueryRaw).toHaveBeenCalledOnce()
  })

  it('returns 400 when query is too short', async () => {
    const app = buildAuthApp()
    const res = await app.inject({ method: 'GET', url: '/search?q=a' })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Query must be at least 2 characters' })
  })

  it('returns 400 when query is missing', async () => {
    const app = buildAuthApp()
    const res = await app.inject({ method: 'GET', url: '/search' })

    expect(res.statusCode).toBe(400)
  })

  it('applies pagination to the raw query', async () => {
    mockQueryRaw.mockResolvedValue([] as never)

    const app = buildAuthApp()
    const res = await app.inject({ method: 'GET', url: '/search?q=hello&page=2&limit=5' })

    expect(res.statusCode).toBe(200)
    expect(res.json().page).toBe(2)
    expect(res.json().limit).toBe(5)
  })
})

describe('Page editor save contract', () => {
  it.each(['', '   ', 'x'.repeat(191)])(
    'rejects an invalid title before querying the database',
    async (title) => {
      const app = buildAuthApp('EDITOR')
      const res = await app.inject({
        method: 'POST',
        url: '/pages',
        payload: { title, sectionId: 'sec-1', content: '' },
      })
      expect(res.statusCode).toBe(400)
      expect(mockPage.create).not.toHaveBeenCalled()
      await app.close()
    },
  )

  it('saves an empty draft without a publication timestamp', async () => {
    mockSection.findFirst.mockResolvedValue({ projectId: 'proj-1' } as never)
    mockPage.aggregate.mockResolvedValue({ _max: { position: null } } as never)
    mockPage.create.mockResolvedValue({ ...fakePage, isDraft: true } as never)
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/pages',
      payload: { title: ' Draft ', sectionId: 'sec-1', isDraft: true },
    })
    expect(res.statusCode).toBe(201)
    expect(mockPage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Draft',
          content: '',
          isDraft: true,
          publishedAt: null,
        }),
      }),
    )
    await app.close()
  })

  it('preserves a collision-suffixed slug when saving unchanged title and publishes a draft', async () => {
    mockPage.findFirst.mockResolvedValue({
      ...fakePage,
      slug: 'introduction-2',
      isDraft: true,
    } as never)
    mockPage.update.mockResolvedValue(fakePage as never)
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'PATCH',
      url: '/pages/introduction-2',
      payload: { title: 'Introduction', content: '<p>Updated</p>', isDraft: false },
    })
    expect(res.statusCode).toBe(200)
    const data = mockPage.update.mock.calls[0][0].data
    expect(data).not.toHaveProperty('slug')
    expect(data).toMatchObject({
      isDraft: false,
      publishedAt: expect.any(Date),
      currentRevision: 1,
    })
    expect(mockRevision.create).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('uses a free slug when renaming to an existing title', async () => {
    mockPage.findFirst.mockResolvedValue(fakePage as never)
    mockPage.findUnique
      .mockResolvedValueOnce({ id: 'other-page' } as never)
      .mockResolvedValueOnce(null)
    mockPage.update.mockResolvedValue(fakePage as never)
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'PATCH',
      url: '/pages/introduction',
      payload: { title: 'Existing title' },
    })
    expect(res.statusCode).toBe(200)
    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: expect.stringMatching(/^existing-title-.+$/) }),
      }),
    )
    await app.close()
  })
})
