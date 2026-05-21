import fastifyPlugin from 'fastify-plugin'
import helmet from '@fastify/helmet'
import { FastifyInstance } from 'fastify'

import { env } from '../config/env.js'

export default fastifyPlugin(async function (fastify: FastifyInstance) {
  fastify.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV !== 'development',
  })
})
