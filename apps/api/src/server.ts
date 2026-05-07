import { fastify } from './app'

fastify.listen({ port: 3001, host: '0.0.0.0' }, () => {
  fastify.log.info('Server is running...')
})
