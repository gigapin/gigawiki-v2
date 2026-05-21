import fastifyPlugin from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { Redis } from 'ioredis'
import { FastifyInstance } from 'fastify'

import { env } from '../config/env.js'

export default fastifyPlugin(async function (fastify: FastifyInstance) {
  fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: new Redis(env.REDIS_URL),
  })
})
