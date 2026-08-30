import fastifyPlugin from 'fastify-plugin'
import multipart from '@fastify/multipart'
import { FastifyInstance } from 'fastify'

export default fastifyPlugin(async function (fastify: FastifyInstance) {
  fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })
})
