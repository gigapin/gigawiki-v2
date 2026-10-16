import { Queue } from 'bullmq'

import { redis } from './redis.js'

export const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
})
export const imageQueue = new Queue('image', { connection: redis })

export const imageAuditQueue = new Queue('image-audit', {
  connection: redis,
  defaultJobOptions: { removeOnComplete: { age: 86400, count: 100 }, removeOnFail: { age: 86400 } },
})
