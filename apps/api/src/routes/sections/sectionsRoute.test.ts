import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { Visibility } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'

import {
  fetchSectionsByProject,
  fetchSection,
  createSection,
  updateSection,
  reorderSections,
  deleteSection,
} from './sectionsRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    project: { findFirst: vi.fn() },
    section: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const mockProject = vi.mocked(prisma.project)
const mockSection = vi.mocked(prisma.section)
const mockTransaction = vi.mocked(prisma.$transaction)

function buildPublicApp() {
  const app = Fastify()
  app.register(fetchSectionsByProject)
  app.register(fetchSection)
  return app
}

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(createSection)
  app.register(updateSection)
  app.register(reorderSections)
  app.register(deleteSection)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  // slug helper looks up the candidate slug; free unless a test says otherwise
  mockSection.findUnique.mockResolvedValue(null)
})

const fakeSection = {
  id: 'sec-1',
  title: 'Introduction',
  slug: 'introduction',
  description: 'Intro section',
  position: 0,
  visibility: Visibility.PUBLIC,
  projectId: 'proj-1',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /projects/:projectSlug/sections', () => {
  it('returns sections ordered by position with _count.pages', async () => {
    mockProject.findFirst.mockResolvedValue({ id: 'proj-1' } as never)
    mockSection.findMany.mockResolvedValue([{ ...fakeSection, _count: { pages: 3 } }] as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/projects/my-project/sections' })

    expect(res.statusCode).toBe(200)
    expect(res.json().sections).toHaveLength(1)
    expect(mockSection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { position: 'asc' } }),
    )
  })

  it('returns 404 when project does not exist', async () => {
    mockProject.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/projects/ghost/sections' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Project not found' })
  })
})

describe('GET /sections/:slug', () => {
  it('returns section with page index fields only', async () => {
    const sectionWithPages = {
      ...fakeSection,
      pages: [{ title: 'Page 1', slug: 'page-1', isDraft: false }],
    }
    mockSection.findFirst.mockResolvedValue(sectionWithPages)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/sections/introduction' })

    expect(res.statusCode).toBe(200)
    expect(res.json().slug).toBe('introduction')
    expect(res.json().pages[0]).toEqual({ title: 'Page 1', slug: 'page-1', isDraft: false })
  })

  it('returns 404 when section does not exist', async () => {
    mockSection.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/sections/missing' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Section not found' })
  })
})

describe('POST /sections', () => {
  it('creates a section for EDITOR role with auto-position', async () => {
    mockSection.aggregate.mockResolvedValue({ _max: { position: 2 } } as never)
    mockSection.create.mockResolvedValue({ ...fakeSection, position: 3 })

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/sections',
      payload: { projectId: 'proj-1', title: 'Introduction' },
    })

    expect(res.statusCode).toBe(201)
    expect(mockSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 3 }),
      }),
    )
  })

  it('defaults position to 0 when no sections exist yet', async () => {
    mockSection.aggregate.mockResolvedValue({ _max: { position: null } } as never)
    mockSection.create.mockResolvedValue(fakeSection)

    const app = buildAuthApp('EDITOR')
    await app.inject({
      method: 'POST',
      url: '/sections',
      payload: { projectId: 'proj-1', title: 'Introduction' },
    })

    expect(mockSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 0 }),
      }),
    )
  })

  it('auto-generates slug from title', async () => {
    mockSection.aggregate.mockResolvedValue({ _max: { position: null } } as never)
    mockSection.create.mockResolvedValue(fakeSection)

    const app = buildAuthApp('ADMIN')
    await app.inject({
      method: 'POST',
      url: '/sections',
      payload: { projectId: 'proj-1', title: 'My Cool Section!' },
    })

    expect(mockSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'my-cool-section' }),
      }),
    )
  })

  it('returns 403 for GUEST role', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'POST',
      url: '/sections',
      payload: { projectId: 'proj-1', title: 'Introduction' },
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('PATCH /sections/:slug', () => {
  it('allows project owner to update', async () => {
    mockSection.findFirst.mockResolvedValue({
      id: 'sec-1',
      project: { userId: 'user-1' },
    } as never)
    mockSection.update.mockResolvedValue(fakeSection)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/sections/introduction',
      payload: { description: 'Updated' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('allows admin to update any section', async () => {
    mockSection.findFirst.mockResolvedValue({
      id: 'sec-1',
      project: { userId: 'other-user' },
    } as never)
    mockSection.update.mockResolvedValue(fakeSection)

    const app = buildAuthApp('ADMIN', 'admin-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/sections/introduction',
      payload: { description: 'Admin update' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 403 for non-owner non-admin', async () => {
    mockSection.findFirst.mockResolvedValue({
      id: 'sec-1',
      project: { userId: 'owner-id' },
    } as never)

    const app = buildAuthApp('EDITOR', 'different-user')
    const res = await app.inject({
      method: 'PATCH',
      url: '/sections/introduction',
      payload: { description: 'Attempt' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when section does not exist', async () => {
    mockSection.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({
      method: 'PATCH',
      url: '/sections/ghost',
      payload: { description: 'x' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('regenerates slug when title is updated', async () => {
    mockSection.findFirst.mockResolvedValue({
      id: 'sec-1',
      project: { userId: 'user-1' },
    } as never)
    mockSection.update.mockResolvedValue({ ...fakeSection, title: 'New Title', slug: 'new-title' })

    const app = buildAuthApp('ADMIN', 'user-1')
    await app.inject({
      method: 'PATCH',
      url: '/sections/introduction',
      payload: { title: 'New Title' },
    })

    expect(mockSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'New Title', slug: 'new-title' }),
      }),
    )
  })
})

describe('PATCH /sections/:slug/position', () => {
  it('batch-updates positions via $transaction', async () => {
    mockTransaction.mockResolvedValue([])

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'PATCH',
      url: '/sections/introduction/position',
      payload: {
        positions: [
          { id: 'sec-1', position: 0 },
          { id: 'sec-2', position: 1 },
        ],
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Positions updated' })
    expect(mockTransaction).toHaveBeenCalledOnce()
  })

  it('returns 403 for GUEST role', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'PATCH',
      url: '/sections/introduction/position',
      payload: { positions: [{ id: 'sec-1', position: 0 }] },
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('DELETE /sections/:slug', () => {
  it('soft-deletes a section as admin', async () => {
    mockSection.findFirst.mockResolvedValue({ id: 'sec-1' } as never)
    mockSection.update.mockResolvedValue({ ...fakeSection, deletedAt: new Date() })

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/sections/introduction' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Section deleted successfully' })
    expect(mockSection.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    )
  })

  it('returns 403 for non-admin', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({ method: 'DELETE', url: '/sections/introduction' })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when section does not exist', async () => {
    mockSection.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/sections/ghost' })

    expect(res.statusCode).toBe(404)
  })
})
