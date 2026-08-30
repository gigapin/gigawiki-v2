import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { Visibility } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'

import {
  fetchAllSubjects,
  fetchSubject,
  createSubject,
  updateSubject,
  deleteSubject,
} from './subjectsRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    subject: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

const mockSubject = vi.mocked(prisma.subject)

function buildPublicApp() {
  const app = Fastify()
  app.register(fetchAllSubjects)
  app.register(fetchSubject)
  return app
}

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(createSubject)
  app.register(updateSubject)
  app.register(deleteSubject)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeSubject = {
  id: 'sub-1',
  name: 'Science',
  slug: 'science',
  description: 'All things science',
  color: 'emerald',
  icon: 'book',
  visibility: Visibility.PUBLIC,
  imageId: null,
  userId: 'user-1',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /subjects', () => {
  it('returns paginated subjects with _count.projects', async () => {
    const subjectWithCount = { ...fakeSubject, _count: { projects: 3 } }
    mockSubject.findMany.mockResolvedValue([subjectWithCount])
    mockSubject.count.mockResolvedValue(1)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/subjects' })

    expect(res.statusCode).toBe(200)
    expect(res.json().subjects).toHaveLength(1)
    expect(res.json().total).toBe(1)
    expect(res.json().page).toBe(1)
  })

  it('filters by visibility', async () => {
    mockSubject.findMany.mockResolvedValue([])
    mockSubject.count.mockResolvedValue(0)

    const app = buildPublicApp()
    await app.inject({ method: 'GET', url: '/subjects?visibility=PRIVATE' })

    expect(mockSubject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, visibility: 'PRIVATE' } }),
    )
  })

  it('always filters out deleted subjects', async () => {
    mockSubject.findMany.mockResolvedValue([])
    mockSubject.count.mockResolvedValue(0)

    const app = buildPublicApp()
    await app.inject({ method: 'GET', url: '/subjects' })

    expect(mockSubject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    )
  })
})

describe('GET /subjects/:slug', () => {
  it('returns a subject with nested projects', async () => {
    const subjectWithProjects = { ...fakeSubject, projects: [] }
    mockSubject.findFirst.mockResolvedValue(subjectWithProjects)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/subjects/science' })

    expect(res.statusCode).toBe(200)
    expect(res.json().slug).toBe('science')
    expect(mockSubject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'science', deletedAt: null } }),
    )
  })

  it('returns 404 when subject does not exist', async () => {
    mockSubject.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/subjects/missing' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Subject not found' })
  })
})

describe('POST /subjects', () => {
  it('creates a subject for EDITOR role', async () => {
    mockSubject.create.mockResolvedValue(fakeSubject)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/subjects',
      payload: { name: 'Science', description: 'All things science' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().slug).toBe('science')
  })

  it('creates a subject for ADMIN role', async () => {
    mockSubject.create.mockResolvedValue(fakeSubject)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({
      method: 'POST',
      url: '/subjects',
      payload: { name: 'Science' },
    })

    expect(res.statusCode).toBe(201)
  })

  it('returns 403 for GUEST role', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'POST',
      url: '/subjects',
      payload: { name: 'Science' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('auto-generates slug from name', async () => {
    mockSubject.create.mockResolvedValue(fakeSubject)

    const app = buildAuthApp('ADMIN')
    await app.inject({
      method: 'POST',
      url: '/subjects',
      payload: { name: 'My Cool Subject!' },
    })

    expect(mockSubject.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'my-cool-subject' }),
      }),
    )
  })
})

describe('PATCH /subjects/:slug', () => {
  it('allows owner to update their subject', async () => {
    mockSubject.findFirst.mockResolvedValue({ id: 'sub-1', userId: 'user-1' } as never)
    const updated = { ...fakeSubject, description: 'Updated' }
    mockSubject.update.mockResolvedValue(updated)

    const app = buildAuthApp('GUEST', 'user-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/subjects/science',
      payload: { description: 'Updated' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('allows admin to update any subject', async () => {
    mockSubject.findFirst.mockResolvedValue({ id: 'sub-1', userId: 'other-user' } as never)
    mockSubject.update.mockResolvedValue(fakeSubject)

    const app = buildAuthApp('ADMIN', 'admin-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/subjects/science',
      payload: { description: 'Admin update' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 403 for non-owner non-admin', async () => {
    mockSubject.findFirst.mockResolvedValue({ id: 'sub-1', userId: 'owner-id' } as never)

    const app = buildAuthApp('EDITOR', 'different-user')
    const res = await app.inject({
      method: 'PATCH',
      url: '/subjects/science',
      payload: { description: 'Attempt' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when subject does not exist', async () => {
    mockSubject.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({
      method: 'PATCH',
      url: '/subjects/ghost',
      payload: { description: 'x' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('regenerates slug when name is updated', async () => {
    mockSubject.findFirst.mockResolvedValue({ id: 'sub-1', userId: 'user-1' } as never)
    mockSubject.update.mockResolvedValue({ ...fakeSubject, name: 'New Name', slug: 'new-name' })

    const app = buildAuthApp('ADMIN', 'user-1')
    await app.inject({
      method: 'PATCH',
      url: '/subjects/science',
      payload: { name: 'New Name' },
    })

    expect(mockSubject.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'New Name', slug: 'new-name' }),
      }),
    )
  })
})

describe('DELETE /subjects/:slug', () => {
  it('soft-deletes a subject as admin', async () => {
    mockSubject.findFirst.mockResolvedValue({ id: 'sub-1' } as never)
    mockSubject.update.mockResolvedValue({ ...fakeSubject, deletedAt: new Date() })

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/subjects/science' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Subject deleted successfully' })
    expect(mockSubject.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    )
  })

  it('returns 403 for non-admin', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({ method: 'DELETE', url: '/subjects/science' })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when subject does not exist', async () => {
    mockSubject.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/subjects/ghost' })

    expect(res.statusCode).toBe(404)
  })
})
