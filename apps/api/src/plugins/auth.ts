import fastifyPlugin from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import jwt from '@fastify/jwt'

import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'

export default fastifyPlugin(async function (fastify: FastifyInstance) {
  fastify.register(jwt, {
    secret: env.JWT_SECRET,
    // Local testing keeps the access token valid until explicit logout.
    sign: env.NODE_ENV === 'development' ? {} : { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  })

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
      const account = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { id: true, email: true, role: true, authVersion: true },
      })
      if (!account || request.user.authVersion !== account.authVersion) {
        reply.status(401).send({ error: 'Session expired. Sign in again.' })
        return
      }
      request.user = account
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
