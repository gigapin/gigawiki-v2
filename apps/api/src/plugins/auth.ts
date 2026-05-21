import fastifyPlugin from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import jwt from '@fastify/jwt'

import { env } from '../config/env.js'

export default fastifyPlugin(async function (fastify: FastifyInstance) {
  fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  })

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  fastify.decorate('requireRole', function (role: string) {
    return function (request: FastifyRequest, reply: FastifyReply, done: () => void) {
      if (request.user?.role !== role) {
        reply.status(403).send({ error: 'Forbidden' })
        return
      }
      done()
    }
  })
})
