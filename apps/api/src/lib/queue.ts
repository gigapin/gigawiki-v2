import { Queue } from 'bullmq'

import { redis } from './redis.js'

export const emailQueue = new Queue('email', { connection: redis })
