import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

import { prisma } from '../../lib/prisma.js'
import { redis } from '../../lib/redis.js'

import { fetchSettings, updateSetting } from './settingsRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    setting: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('../../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}))

const mockSetting = vi.mocked(prisma.setting)
const mockRedis = vi.mocked(redis)

function buildPublicApp() {
  const app = Fastify()
  app.register(fetchSettings)
  return app
}

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(updateSetting)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRedis.get.mockResolvedValue(null)
  mockRedis.set.mockResolvedValue('OK')
  mockRedis.del.mockResolvedValue(1)
})

const fakeRows = [
  { id: 'set-1', key: 'ALLOW_SELF_REGISTRATION', value: 'true' },
  { id: 'set-2', key: 'SITE_NAME', value: 'GiGaWiki' },
]

describe('GET /settings', () => {
  it('reads from the database on a cache miss and returns a key/value map', async () => {
    mockSetting.findMany.mockResolvedValue(fakeRows as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/settings' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ALLOW_SELF_REGISTRATION: 'true', SITE_NAME: 'GiGaWiki' })
  })

  it('caches the map for 60 seconds after a miss', async () => {
    mockSetting.findMany.mockResolvedValue(fakeRows as never)

    const app = buildPublicApp()
    await app.inject({ method: 'GET', url: '/settings' })

    expect(mockRedis.set).toHaveBeenCalledWith(
      'settings:all',
      JSON.stringify({ ALLOW_SELF_REGISTRATION: 'true', SITE_NAME: 'GiGaWiki' }),
      'EX',
      60,
    )
  })

  it('serves a cache hit without touching the database', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ SITE_NAME: 'Cached' }))

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/settings' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ SITE_NAME: 'Cached' })
    expect(mockSetting.findMany).not.toHaveBeenCalled()
  })

  it('omits keys that are not on the allowlist', async () => {
    mockSetting.findMany.mockResolvedValue([
      ...fakeRows,
      { id: 'set-9', key: 'INTERNAL_SECRET', value: 'nope' },
    ] as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/settings' })

    expect(res.json()).not.toHaveProperty('INTERNAL_SECRET')
  })

  it('falls back to the database when Redis is unavailable', async () => {
    mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'))
    mockRedis.set.mockRejectedValue(new Error('ECONNREFUSED'))
    mockSetting.findMany.mockResolvedValue(fakeRows as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/settings' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ALLOW_SELF_REGISTRATION: 'true', SITE_NAME: 'GiGaWiki' })
  })

  it('requires no authentication', async () => {
    mockSetting.findMany.mockResolvedValue([] as never)

    const app = buildPublicApp()
    const res = await app.inject({ method: 'GET', url: '/settings' })

    expect(res.statusCode).toBe(200)
  })
})

describe('PUT /settings/:key', () => {
  it('upserts an allowlisted key for an admin', async () => {
    mockSetting.upsert.mockResolvedValue({
      id: 'set-2',
      key: 'SITE_NAME',
      value: 'MyWiki',
    } as never)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({
      method: 'PUT',
      url: '/settings/SITE_NAME',
      payload: { value: 'MyWiki' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ key: 'SITE_NAME', value: 'MyWiki' })
    expect(mockSetting.upsert).toHaveBeenCalledWith({
      where: { key: 'SITE_NAME' },
      update: { value: 'MyWiki' },
      create: { key: 'SITE_NAME', value: 'MyWiki' },
    })
  })

  it('invalidates the cache after a write', async () => {
    mockSetting.upsert.mockResolvedValue({
      id: 'set-2',
      key: 'SITE_NAME',
      value: 'MyWiki',
    } as never)

    const app = buildAuthApp('ADMIN')
    await app.inject({ method: 'PUT', url: '/settings/SITE_NAME', payload: { value: 'MyWiki' } })

    expect(mockRedis.del).toHaveBeenCalledWith('settings:all')
  })

  it('returns 403 for EDITOR', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'PUT',
      url: '/settings/SITE_NAME',
      payload: { value: 'MyWiki' },
    })

    expect(res.statusCode).toBe(403)
    expect(mockSetting.upsert).not.toHaveBeenCalled()
  })

  it('returns 403 for GUEST', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'PUT',
      url: '/settings/SITE_NAME',
      payload: { value: 'MyWiki' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 for a key that is not on the allowlist', async () => {
    const app = buildAuthApp('ADMIN')
    const res = await app.inject({
      method: 'PUT',
      url: '/settings/INTERNAL_SECRET',
      payload: { value: 'nope' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/unknown setting key/i)
    expect(mockSetting.upsert).not.toHaveBeenCalled()
  })

  it('returns 400 when value is missing', async () => {
    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'PUT', url: '/settings/SITE_NAME', payload: {} })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/must be a string/i)
  })

  it('returns 400 when value is not a string', async () => {
    const app = buildAuthApp('ADMIN')
    const res = await app.inject({
      method: 'PUT',
      url: '/settings/ALLOW_SELF_REGISTRATION',
      payload: { value: true },
    })

    expect(res.statusCode).toBe(400)
    expect(mockSetting.upsert).not.toHaveBeenCalled()
  })

  it('still succeeds when cache invalidation fails', async () => {
    mockRedis.del.mockRejectedValue(new Error('ECONNREFUSED'))
    mockSetting.upsert.mockResolvedValue({
      id: 'set-2',
      key: 'SITE_NAME',
      value: 'MyWiki',
    } as never)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({
      method: 'PUT',
      url: '/settings/SITE_NAME',
      payload: { value: 'MyWiki' },
    })

    expect(res.statusCode).toBe(200)
  })
})
