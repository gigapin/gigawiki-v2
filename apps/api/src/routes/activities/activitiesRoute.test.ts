import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { ActivityType, ResourceType } from '@prisma/client'

import { prisma } from '../../lib/prisma.js'

import { fetchActivities, fetchUserActivities, logActivity } from './activitiesRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    activity: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

const mockActivity = vi.mocked(prisma.activity)

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(fetchActivities)
  app.register(fetchUserActivities)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeActivity = {
  id: 'act-1',
  userId: 'user-1',
  type: 'CREATED',
  resourceType: 'PAGE',
  details: null,
  ip: null,
  pageId: 'page-1',
  projectId: null,
  sectionId: null,
  createdAt: new Date(),
  user: { id: 'user-1', name: 'Alice' },
  page: { title: 'Introduction' },
  project: null,
  section: null,
}

describe('GET /activities', () => {
  it('returns activities for admin', async () => {
    mockActivity.findMany.mockResolvedValue([fakeActivity] as never)
    mockActivity.count.mockResolvedValue(1)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'GET', url: '/activities' })

    expect(res.statusCode).toBe(200)
    expect(res.json().activities).toHaveLength(1)
    expect(res.json().total).toBe(1)
  })

  it('returns 403 for non-admin', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({ method: 'GET', url: '/activities' })

    expect(res.statusCode).toBe(403)
  })

  it('filters by userId', async () => {
    mockActivity.findMany.mockResolvedValue([])
    mockActivity.count.mockResolvedValue(0)

    const app = buildAuthApp('ADMIN')
    await app.inject({ method: 'GET', url: '/activities?userId=user-2' })

    expect(mockActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-2' }) }),
    )
  })

  it('filters by resourceType and type', async () => {
    mockActivity.findMany.mockResolvedValue([])
    mockActivity.count.mockResolvedValue(0)

    const app = buildAuthApp('ADMIN')
    await app.inject({ method: 'GET', url: '/activities?resourceType=PAGE&type=CREATED' })

    expect(mockActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resourceType: 'PAGE', type: 'CREATED' }),
      }),
    )
  })

  it('filters by date range', async () => {
    mockActivity.findMany.mockResolvedValue([])
    mockActivity.count.mockResolvedValue(0)

    const app = buildAuthApp('ADMIN')
    await app.inject({ method: 'GET', url: '/activities?from=2024-01-01&to=2024-12-31' })

    expect(mockActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
      }),
    )
  })

  it('applies pagination', async () => {
    mockActivity.findMany.mockResolvedValue([])
    mockActivity.count.mockResolvedValue(0)

    const app = buildAuthApp('ADMIN')
    await app.inject({ method: 'GET', url: '/activities?page=2&limit=10' })

    expect(mockActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    )
  })
})

describe('GET /users/:id/activities', () => {
  it('returns own activities', async () => {
    mockActivity.findMany.mockResolvedValue([fakeActivity] as never)
    mockActivity.count.mockResolvedValue(1)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({ method: 'GET', url: '/users/user-1/activities' })

    expect(res.statusCode).toBe(200)
    expect(res.json().activities).toHaveLength(1)
  })

  it('resolves me alias to current user', async () => {
    mockActivity.findMany.mockResolvedValue([])
    mockActivity.count.mockResolvedValue(0)

    const app = buildAuthApp('EDITOR', 'user-1')
    await app.inject({ method: 'GET', url: '/users/me/activities' })

    expect(mockActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    )
  })

  it('allows admin to view any user activities', async () => {
    mockActivity.findMany.mockResolvedValue([])
    mockActivity.count.mockResolvedValue(0)

    const app = buildAuthApp('ADMIN', 'admin-1')
    const res = await app.inject({ method: 'GET', url: '/users/other-user/activities' })

    expect(res.statusCode).toBe(200)
  })

  it('returns 403 when non-owner non-admin tries to view', async () => {
    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({ method: 'GET', url: '/users/other-user/activities' })

    expect(res.statusCode).toBe(403)
  })
})

describe('logActivity', () => {
  it('creates an activity record', async () => {
    mockActivity.create.mockResolvedValue(fakeActivity as never)

    await logActivity(
      'user-1',
      ActivityType.CREATED,
      ResourceType.PAGE,
      { pageId: 'page-1' },
      'Created a page',
      '127.0.0.1',
    )

    expect(mockActivity.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: ActivityType.CREATED,
        resourceType: ResourceType.PAGE,
        details: 'Created a page',
        ip: '127.0.0.1',
        pageId: 'page-1',
      },
    })
  })

  it('works without optional params', async () => {
    mockActivity.create.mockResolvedValue(fakeActivity as never)

    await logActivity('user-1', ActivityType.DELETED, ResourceType.PROJECT, { projectId: 'proj-1' })

    expect(mockActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: ActivityType.DELETED,
        resourceType: ResourceType.PROJECT,
        details: undefined,
        ip: undefined,
        projectId: 'proj-1',
      }),
    })
  })
})
