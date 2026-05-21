import fastifyPlugin from 'fastify-plugin'
import cors from '@fastify/cors'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { env } from './../config/env.js'

export default fastifyPlugin(async function (fastify: FastifyInstance) {
  fastify.register(cors, {
    origin: (origin, cb) => {
      const hostname = new URL(env.APP_URL).hostname
      if (hostname === 'localhost') {
        cb(null, true)
        return
      }
      cb(new Error('Not Allowed'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  fastify.decorate(
    'cors',
    function (_request: FastifyRequest, _reply: FastifyReply, done: () => void) {
      done()
    },
  )
})
