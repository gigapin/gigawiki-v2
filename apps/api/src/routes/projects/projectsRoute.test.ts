import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import jwtPlugin from '@fastify/jwt'
import { Visibility } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'

import {
  fetchProjectsBySubject,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  fetchProjectActivity,
} from './projectsRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    subject: { findFirst: vi.fn() },
    project: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    view: { upsert: vi.fn() },
    section: { findMany: vi.fn() },
    page: { findMany: vi.fn() },
    activity: { findMany: vi.fn(), count: vi.fn() },
  },
}))

const mockSubject = vi.mocked(prisma.subject)
const mockProject = vi.mocked(prisma.project)
const mockView = vi.mocked(prisma.view)
const mockSection = vi.mocked(prisma.section)
const mockPage = vi.mocked(prisma.page)
const mockActivity = vi.mocked(prisma.activity)

const JWT_SECRET = 'test-secret'

function buildPublicApp() {
  const app = Fastify()
  app.register(jwtPlugin, { secret: JWT_SECRET })
  app.register(fetchProjectsBySubject)
  app.register(fetchProject)
  return app
}

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(createProject)
  app.register(updateProject)
  app.register(deleteProject)
  app.register(fetchProjectActivity)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  // slug helper looks up the candidate slug; free unless a test says otherwise
  mockProject.findUnique.mockResolvedValue(null)
})

const fakeProject = {
  id: 'proj-1',
  name: 'My Project',
  slug: 'my-project',
  description: 'A project',
  visibility: Visibility.PUBLIC,
  imageId: null,
  userId: 'user-1',
  subjectId: 'sub-1',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /subjects/:subjectSlug/projects', () => {
  it('returns paginated projects with _count for a subject', async () => {
    mockSubject.findFirst.mockResolvedValue({ id: 'sub-1' } as never)
    const projectWithCount = { ...fakeProject, _count: { sections: 2, pages: 5 } }
    mockProject.findMany.mockResolvedValue([projectWithCount])
    mockProject.count.mockResolvedValue(1)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/subjects/science/projects' })

    expect(res.statusCode).toBe(200)
    expect(res.json().projects).toHaveLength(1)
    expect(res.json().total).toBe(1)
  })

  it('returns 404 when subject does not exist', async () => {
    mockSubject.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/subjects/missing/projects' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Subject not found' })
  })

  it('passes pagination params to the query', async () => {
    mockSubject.findFirst.mockResolvedValue({ id: 'sub-1' } as never)
    mockProject.findMany.mockResolvedValue([])
    mockProject.count.mockResolvedValue(0)

    const app = buildPublicApp()
    await app.inject({ method: 'GET', url: '/subjects/science/projects?page=2&limit=5' })

    expect(mockProject.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }))
  })
})

describe('GET /projects/:slug', () => {
  it('returns project with sections, tags and _count.favorites', async () => {
    const fullProject = { ...fakeProject, sections: [], tags: [], _count: { favorites: 4 } }
    mockProject.findFirst.mockResolvedValue(fullProject)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/projects/my-project' })

    expect(res.statusCode).toBe(200)
    expect(res.json().slug).toBe('my-project')
  })

  it('returns 404 when project does not exist', async () => {
    mockProject.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/projects/missing' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Project not found' })
  })

  it('upserts a View when request is authenticated', async () => {
    const fullProject = { ...fakeProject, sections: [], tags: [], _count: { favorites: 0 } }
    mockProject.findFirst.mockResolvedValue(fullProject)
    mockView.upsert.mockResolvedValue({} as never)

    const app = buildPublicApp()
    await app.ready()
    const token = app.jwt.sign({ id: 'user-1', email: 'u@e.com', role: 'GUEST' })

    const res = await app.inject({
      method: 'GET',
      url: '/projects/my-project',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    // Give the fire-and-forget a tick to run
    await new Promise((r) => setImmediate(r))
    expect(mockView.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_projectId: { userId: 'user-1', projectId: 'proj-1' } },
      }),
    )
  })

  it('does not upsert a View for unauthenticated requests', async () => {
    const fullProject = { ...fakeProject, sections: [], tags: [], _count: { favorites: 0 } }
    mockProject.findFirst.mockResolvedValue(fullProject)

    const app = buildPublicApp()
    await app.inject({ method: 'GET', url: '/projects/my-project' })

    await new Promise((r) => setImmediate(r))
    expect(mockView.upsert).not.toHaveBeenCalled()
  })
})

describe('POST /projects', () => {
  it('creates a project for EDITOR role', async () => {
    mockProject.create.mockResolvedValue(fakeProject)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { name: 'My Project', subjectId: 'sub-1' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().slug).toBe('my-project')
  })

  it('returns 403 for GUEST role', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { name: 'My Project', subjectId: 'sub-1' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('auto-generates slug from name', async () => {
    mockProject.create.mockResolvedValue(fakeProject)

    const app = buildAuthApp('ADMIN')
    await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { name: 'My Cool Project!', subjectId: 'sub-1' },
    })

    expect(mockProject.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'my-cool-project' }),
      }),
    )
  })
})

describe('PATCH /projects/:slug', () => {
  it('allows owner to update', async () => {
    mockProject.findFirst.mockResolvedValue({ id: 'proj-1', userId: 'user-1' } as never)
    mockProject.update.mockResolvedValue(fakeProject)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/projects/my-project',
      payload: { description: 'Updated' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('allows admin to update any project', async () => {
    mockProject.findFirst.mockResolvedValue({ id: 'proj-1', userId: 'other-user' } as never)
    mockProject.update.mockResolvedValue(fakeProject)

    const app = buildAuthApp('ADMIN', 'admin-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/projects/my-project',
      payload: { description: 'Admin update' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 403 for non-owner non-admin', async () => {
    mockProject.findFirst.mockResolvedValue({ id: 'proj-1', userId: 'owner-id' } as never)

    const app = buildAuthApp('EDITOR', 'different-user')
    const res = await app.inject({
      method: 'PATCH',
      url: '/projects/my-project',
      payload: { description: 'Attempt' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when project does not exist', async () => {
    mockProject.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({
      method: 'PATCH',
      url: '/projects/ghost',
      payload: { description: 'x' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('regenerates slug when name is updated', async () => {
    mockProject.findFirst.mockResolvedValue({ id: 'proj-1', userId: 'user-1' } as never)
    mockProject.update.mockResolvedValue({ ...fakeProject, name: 'New Name', slug: 'new-name' })

    const app = buildAuthApp('ADMIN', 'user-1')
    await app.inject({
      method: 'PATCH',
      url: '/projects/my-project',
      payload: { name: 'New Name' },
    })

    expect(mockProject.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'New Name', slug: 'new-name' }),
      }),
    )
  })
})

describe('DELETE /projects/:slug', () => {
  it('soft-deletes a project as admin', async () => {
    mockProject.findFirst.mockResolvedValue({ id: 'proj-1' } as never)
    mockProject.update.mockResolvedValue({ ...fakeProject, deletedAt: new Date() })

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/projects/my-project' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Project deleted successfully' })
    expect(mockProject.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    )
  })

  it('returns 403 for non-admin', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({ method: 'DELETE', url: '/projects/my-project' })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when project does not exist', async () => {
    mockProject.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/projects/ghost' })

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /projects/:slug/activity', () => {
  it('returns paginated activity log', async () => {
    mockProject.findFirst.mockResolvedValue({ id: 'proj-1' } as never)
    mockSection.findMany.mockResolvedValue([{ id: 'sec-1' }] as never)
    mockPage.findMany.mockResolvedValue([{ id: 'page-1' }] as never)
    mockActivity.findMany.mockResolvedValue([])
    mockActivity.count.mockResolvedValue(0)

    const app = buildAuthApp()
    const res = await app.inject({ method: 'GET', url: '/projects/my-project/activity' })

    expect(res.statusCode).toBe(200)
    expect(res.json().activities).toEqual([])
    expect(res.json().total).toBe(0)
  })

  it('returns 404 when project does not exist', async () => {
    mockProject.findFirst.mockResolvedValue(null)

    const app = buildAuthApp()
    const res = await app.inject({ method: 'GET', url: '/projects/ghost/activity' })

    expect(res.statusCode).toBe(404)
  })

  it('queries activities for project and its children', async () => {
    mockProject.findFirst.mockResolvedValue({ id: 'proj-1' } as never)
    mockSection.findMany.mockResolvedValue([{ id: 'sec-1' }] as never)
    mockPage.findMany.mockResolvedValue([{ id: 'page-1' }] as never)
    mockActivity.findMany.mockResolvedValue([])
    mockActivity.count.mockResolvedValue(0)

    const app = buildAuthApp()
    await app.inject({ method: 'GET', url: '/projects/my-project/activity' })

    expect(mockActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { projectId: 'proj-1' },
            { sectionId: { in: ['sec-1'] } },
            { pageId: { in: ['page-1'] } },
          ],
        },
      }),
    )
  })
})
