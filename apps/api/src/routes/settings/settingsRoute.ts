import { FastifyInstance } from 'fastify'

import { prisma } from '../../lib/prisma.js'
import { redis } from '../../lib/redis.js'

type SettingKeyParams = { key: string }
type UpdateSettingBody = { value?: unknown }

/**
 * Keys an admin is allowed to read or write. `GET /settings` is unauthenticated,
 * so anything not on this list is never exposed.
 */
const ALLOWED_KEYS = [
  'ALLOW_SELF_REGISTRATION',
  'DEFAULT_USER_ROLE',
  'SITE_NAME',
  'SITE_LOGO_IMAGE_ID',
] as const

const CACHE_KEY = 'settings:all'
const CACHE_TTL = 60

function isAllowedKey(key: string): boolean {
  return (ALLOWED_KEYS as readonly string[]).includes(key)
}

export async function fetchSettings(fastify: FastifyInstance) {
  fastify.get('/settings', async (req, reply) => {
    // Redis is a cache, not a dependency — this endpoint is on the pre-login path,
    // so a Redis outage must degrade to a plain database read rather than a 500.
    try {
      const cached = await redis.get(CACHE_KEY)
      if (cached) return reply.status(200).send(JSON.parse(cached))
    } catch (err) {
      req.log.warn({ err }, 'settings cache read failed')
    }

    const rows = await prisma.setting.findMany()

    const settings = rows.reduce<Record<string, string>>((acc, row) => {
      if (isAllowedKey(row.key)) acc[row.key] = row.value
      return acc
    }, {})

    try {
      await redis.set(CACHE_KEY, JSON.stringify(settings), 'EX', CACHE_TTL)
    } catch (err) {
      req.log.warn({ err }, 'settings cache write failed')
    }

    return reply.status(200).send(settings)
  })
}

export async function updateSetting(fastify: FastifyInstance) {
  fastify.put<{ Params: SettingKeyParams; Body: UpdateSettingBody }>(
    '/settings/:key',
    async (req, reply) => {
      if (req.user.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Admin access required' })
      }

      const { key } = req.params

      if (!isAllowedKey(key)) {
        return reply.status(400).send({ error: `Unknown setting key: ${key}` })
      }

      const { value } = req.body ?? {}

      if (typeof value !== 'string') {
        return reply.status(400).send({ error: 'value is required and must be a string' })
      }

      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })

      try {
        await redis.del(CACHE_KEY)
      } catch (err) {
        req.log.warn({ err }, 'settings cache invalidation failed')
      }

      return reply.status(200).send({ key, value })
    },
  )
}
