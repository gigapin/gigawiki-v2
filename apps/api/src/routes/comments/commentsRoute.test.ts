import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

import { prisma } from '../../lib/prisma.js'

import {
  fetchPageComments,
  fetchProjectComments,
  fetchSectionComments,
  createComment,
  updateComment,
  deleteComment,
} from './commentsRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    page: { findFirst: vi.fn() },
    project: { findFirst: vi.fn() },
    section: { findFirst: vi.fn() },
    comment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const mockPage = vi.mocked(prisma.page)
const mockProject = vi.mocked(prisma.project)
const mockSection = vi.mocked(prisma.section)
const mockComment = vi.mocked(prisma.comment)

function buildPublicApp() {
  const app = Fastify()
  app.register(fetchPageComments)
  app.register(fetchProjectComments)
  app.register(fetchSectionComments)
  return app
}

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(createComment)
  app.register(updateComment)
  app.register(deleteComment)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeComment = {
  id: 'comment-1',
  body: 'Great page!',
  parentId: null,
  userId: 'user-1',
  pageId: 'page-1',
  projectId: null,
  sectionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'user-1', name: 'Alice', slug: 'alice' },
  replies: [],
}

describe('GET /pages/:pageSlug/comments', () => {
  it('returns root-level comments with replies for a page', async () => {
    mockPage.findFirst.mockResolvedValue({ id: 'page-1' } as never)
    mockComment.findMany.mockResolvedValue([fakeComment] as never)
    mockComment.count.mockResolvedValue(1)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/introduction/comments' })

    expect(res.statusCode).toBe(200)
    expect(res.json().comments).toHaveLength(1)
    expect(res.json().total).toBe(1)
    expect(mockComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pageId: 'page-1', parentId: null } }),
    )
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/pages/ghost/comments' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Page not found' })
  })

  it('applies pagination params', async () => {
    mockPage.findFirst.mockResolvedValue({ id: 'page-1' } as never)
    mockComment.findMany.mockResolvedValue([])
    mockComment.count.mockResolvedValue(0)

    const app = buildPublicApp()
    await app.inject({ method: 'GET', url: '/pages/introduction/comments?page=2&limit=5' })

    expect(mockComment.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }))
  })
})

describe('GET /projects/:projectSlug/comments', () => {
  it('returns comments for a project', async () => {
    mockProject.findFirst.mockResolvedValue({ id: 'proj-1' } as never)
    mockComment.findMany.mockResolvedValue([
      { ...fakeComment, pageId: null, projectId: 'proj-1' },
    ] as never)
    mockComment.count.mockResolvedValue(1)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/projects/my-project/comments' })

    expect(res.statusCode).toBe(200)
    expect(res.json().comments).toHaveLength(1)
    expect(mockComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'proj-1', parentId: null } }),
    )
  })

  it('returns 404 when project does not exist', async () => {
    mockProject.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/projects/ghost/comments' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Project not found' })
  })
})

describe('GET /sections/:sectionSlug/comments', () => {
  it('returns comments for a section', async () => {
    mockSection.findFirst.mockResolvedValue({ id: 'sec-1' } as never)
    mockComment.findMany.mockResolvedValue([
      { ...fakeComment, pageId: null, sectionId: 'sec-1' },
    ] as never)
    mockComment.count.mockResolvedValue(1)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/sections/intro/comments' })

    expect(res.statusCode).toBe(200)
    expect(res.json().comments).toHaveLength(1)
    expect(mockComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sectionId: 'sec-1', parentId: null } }),
    )
  })

  it('returns 404 when section does not exist', async () => {
    mockSection.findFirst.mockResolvedValue(null)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/sections/ghost/comments' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Section not found' })
  })
})

describe('POST /comments', () => {
  it('creates a comment on a page', async () => {
    mockComment.create.mockResolvedValue(fakeComment as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/comments',
      payload: { body: 'Great page!', pageId: 'page-1' },
    })

    expect(res.statusCode).toBe(201)
    expect(mockComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', body: 'Great page!', pageId: 'page-1' }),
      }),
    )
  })

  it('creates a reply with parentId', async () => {
    const parentComment = { id: 'comment-1', pageId: 'page-1', projectId: null, sectionId: null }
    mockComment.findFirst.mockResolvedValue(parentComment as never)
    mockComment.create.mockResolvedValue({ ...fakeComment, parentId: 'comment-1' } as never)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/comments',
      payload: { body: 'Reply!', pageId: 'page-1', parentId: 'comment-1' },
    })

    expect(res.statusCode).toBe(201)
    expect(mockComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentId: 'comment-1' }),
      }),
    )
  })

  it('returns 400 when no target is provided', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/comments',
      payload: { body: 'Comment without target' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/exactly one/i)
  })

  it('returns 400 when multiple targets are provided', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/comments',
      payload: { body: 'Comment', pageId: 'page-1', projectId: 'proj-1' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when parent belongs to a different resource', async () => {
    const parentComment = {
      id: 'comment-1',
      pageId: 'other-page',
      projectId: null,
      sectionId: null,
    }
    mockComment.findFirst.mockResolvedValue(parentComment as never)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/comments',
      payload: { body: 'Reply!', pageId: 'page-1', parentId: 'comment-1' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/different resource/i)
  })

  it('returns 400 when parent comment does not exist', async () => {
    mockComment.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/comments',
      payload: { body: 'Reply!', pageId: 'page-1', parentId: 'nonexistent' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/parent comment not found/i)
  })
})

describe('Comment validation', () => {
  it.each(['', '   '])('rejects empty body %j before writing', async (body) => {
    const app = buildAuthApp()
    const created = await app.inject({
      method: 'POST',
      url: '/comments',
      payload: { body, pageId: 'page-1' },
    })
    const updated = await app.inject({
      method: 'PATCH',
      url: '/comments/comment-1',
      payload: { body },
    })
    expect(created.statusCode).toBe(400)
    expect(updated.statusCode).toBe(400)
    expect(mockComment.create).not.toHaveBeenCalled()
    expect(mockComment.update).not.toHaveBeenCalled()
    await app.close()
  })
  it('rejects replies to replies', async () => {
    mockComment.findFirst.mockResolvedValue({ pageId: 'page-1', parentId: 'root' } as never)
    const app = buildAuthApp()
    const res = await app.inject({
      method: 'POST',
      url: '/comments',
      payload: { body: 'Nested', pageId: 'page-1', parentId: 'reply' },
    })
    expect(res.statusCode).toBe(400)
    expect(mockComment.create).not.toHaveBeenCalled()
    await app.close()
  })
})

describe('PATCH /comments/:id', () => {
  it('allows owner to update their comment', async () => {
    mockComment.findFirst.mockResolvedValue({ id: 'comment-1', userId: 'user-1' } as never)
    mockComment.update.mockResolvedValue({ ...fakeComment, body: 'Updated!' } as never)

    const app = buildAuthApp('GUEST', 'user-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/comments/comment-1',
      payload: { body: 'Updated!' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockComment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { body: 'Updated!' } }),
    )
  })

  it('returns 403 when non-owner tries to update', async () => {
    mockComment.findFirst.mockResolvedValue({ id: 'comment-1', userId: 'other-user' } as never)

    const app = buildAuthApp('ADMIN', 'user-1')
    const res = await app.inject({
      method: 'PATCH',
      url: '/comments/comment-1',
      payload: { body: 'Hijack!' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when comment does not exist', async () => {
    mockComment.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({
      method: 'PATCH',
      url: '/comments/ghost',
      payload: { body: 'x' },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /comments/:id', () => {
  it('allows owner to hard-delete their comment', async () => {
    mockComment.findFirst.mockResolvedValue({ id: 'comment-1', userId: 'user-1' } as never)
    mockComment.delete.mockResolvedValue(fakeComment as never)

    const app = buildAuthApp('GUEST', 'user-1')
    const res = await app.inject({ method: 'DELETE', url: '/comments/comment-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Comment deleted successfully' })
    expect(mockComment.delete).toHaveBeenCalledWith({ where: { id: 'comment-1' } })
  })

  it('allows admin to delete any comment', async () => {
    mockComment.findFirst.mockResolvedValue({ id: 'comment-1', userId: 'other-user' } as never)
    mockComment.delete.mockResolvedValue(fakeComment as never)

    const app = buildAuthApp('ADMIN', 'admin-1')
    const res = await app.inject({ method: 'DELETE', url: '/comments/comment-1' })

    expect(res.statusCode).toBe(200)
  })

  it('returns 403 for non-owner non-admin', async () => {
    mockComment.findFirst.mockResolvedValue({ id: 'comment-1', userId: 'owner-id' } as never)

    const app = buildAuthApp('EDITOR', 'different-user')
    const res = await app.inject({ method: 'DELETE', url: '/comments/comment-1' })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when comment does not exist', async () => {
    mockComment.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/comments/ghost' })

    expect(res.statusCode).toBe(404)
  })
})
