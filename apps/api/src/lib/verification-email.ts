import { nanoid } from 'nanoid'

import { env } from '../config/env.js'

import { emailQueue } from './queue.js'
import { redis } from './redis.js'

export async function queueVerificationEmail(user: { id: string; name: string; email: string }) {
  const token = nanoid(32)
  const url = new URL('/verify-email', env.FRONTEND_URL)
  url.searchParams.set('token', token)
  await redis.set(`verify:${token}`, user.id, 'EX', 86400)
  await emailQueue.add('verify-email', {
    to: user.email,
    template: 'verify',
    data: { name: user.name, verifyUrl: url.toString() },
  })
}
