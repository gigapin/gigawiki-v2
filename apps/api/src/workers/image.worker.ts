import { Worker } from 'bullmq'

import { redis } from '../lib/redis.js'

export function startImageWorker() {
  return new Worker(
    'image',
    async (job) => {
      // Placeholder: future multi-size and blurhash processing
      console.log('[image worker] job received:', job.name)
    },
    { connection: redis },
  )
}
