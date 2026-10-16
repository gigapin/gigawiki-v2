import { Worker } from 'bullmq'

import { redis } from '../lib/redis.js'
import { auditImages } from '../lib/image-audit.js'

export function startImageAuditWorker() {
  return new Worker('image-audit', () => auditImages(), { connection: redis, concurrency: 1 })
}
