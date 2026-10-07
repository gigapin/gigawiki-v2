import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'

import { env } from '../config/env.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 3000 }),
})
const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  connectTimeout: 3000,
  commandTimeout: 3000,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
})
redis.on('error', () => {
  /* Report a cache failure below without printing connection details. */
})

try {
  const setting = await prisma.setting.upsert({
    where: { key: 'ALLOW_SELF_REGISTRATION' },
    create: { key: 'ALLOW_SELF_REGISTRATION', value: 'true' },
    update: { value: 'true' },
  })
  console.log(`${setting.key}=${setting.value}`)
  try {
    await redis.del('settings:all')
    console.log('Public settings cache cleared.')
  } catch {
    console.warn('Setting saved. The public settings cache will expire within 60 seconds.')
  }
} catch {
  console.error(
    'Could not update the database. Check that PostgreSQL is running and DATABASE_URL is configured.',
  )
  process.exitCode = 1
} finally {
  redis.disconnect()
  await prisma.$disconnect()
}
