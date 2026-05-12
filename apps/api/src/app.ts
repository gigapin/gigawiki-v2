import './lib/env.js'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'

import {
  createProject,
  fetchProject,
  fetchAllProjects,
  updateProject,
  deleteProject,
} from './routes/projects/projectsRoute.js'
import {
  createSubject,
  fetchSubject,
  fetchAllSubjects,
  updateSubject,
  deleteSubject,
} from './routes/subjects/subjectsRoute.js'
import {
  createSection,
  fetchSection,
  fetchAllSections,
  updateSection,
  deleteSection,
} from './routes/sections/sectionsRoute.js'
import {
  createUser,
  fetchUser,
  updateUser,
  deleteUser,
  fetchAllUsers,
} from './routes/users/usersRoutes.js'
import { login } from './routes/auth/authRoutes.js'
import authJwtPlugin from './plugins/auth.js'
export const fastify = Fastify({ logger: true })

fastify.register(cookie)
fastify.register(authJwtPlugin)

fastify.register(login)

fastify.register(
  (app, _, done) => {
    app.register(createProject)
    app.register(fetchProject)
    app.register(fetchAllProjects)
    app.register(updateProject)
    app.register(deleteProject)

    app.register(createSubject)
    app.register(fetchSubject)
    app.register(fetchAllSubjects)
    app.register(updateSubject)
    app.register(deleteSubject)

    app.register(createSection)
    app.register(fetchSection)
    app.register(fetchAllSections)
    app.register(updateSection)
    app.register(deleteSection)

    app.register(createUser)
    app.register(fetchUser)
    app.register(fetchAllUsers)
    app.register(updateUser)
    app.register(deleteUser)

    done()
  },
  { prefix: '/api/v2', preHandler: authJwtPlugin },
)
