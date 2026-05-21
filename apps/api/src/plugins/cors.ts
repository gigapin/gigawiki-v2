import fastifyPlugin from 'fastify-plugin'
import cors from '@fastify/cors'
import { FastifyInstance } from 'fastify'

import { env } from './../config/env.js'

export default fastifyPlugin(async function (fastify: FastifyInstance) {
  fastify.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
})
