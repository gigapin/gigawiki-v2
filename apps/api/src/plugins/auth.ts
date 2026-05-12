import fastifyPlugin from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import jwt from '@fastify/jwt'

export default fastifyPlugin(async function (fastify: FastifyInstance) {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'secret',
  })

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
})
