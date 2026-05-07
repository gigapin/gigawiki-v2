import './lib/env'
import Fastify from 'fastify'

import { ProjectsRoute } from './routes/projects/projectsRoute'
import {
  createUser,
  fetchUser,
  updateUser,
  deleteUser,
  fetchAllUsers,
} from './routes/users/usersRoutes'

export const fastify = Fastify({ logger: true })

fastify.register(ProjectsRoute)
fastify.register(createUser)
fastify.register(fetchUser)
fastify.register(updateUser)
fastify.register(deleteUser)
fastify.register(fetchAllUsers)
