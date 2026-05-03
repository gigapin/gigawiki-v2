import type { FastifyInstance } from 'fastify'

export async function ProjectsRoute(fastify: FastifyInstance) {
  fastify.get('/projects', (_req, reply) => {
    reply.send('Projects')
  })
}
