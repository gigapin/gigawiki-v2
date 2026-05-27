import { Queue } from 'bullmq'

import { redis } from './redis.js'

export const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
})
export const imageQueue = new Queue('image', { connection: redis })
