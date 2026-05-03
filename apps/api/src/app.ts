import FastifyInstance from 'fastify'

import { ProjectsRoute } from './routes/projects/projectsRoute'
// import express from 'express'

/*export async function  build(opts = {}) {
    const app = fastify(opts)

    app.get('/', async (request, reply) => {
        return { hello: 'world' }
    })

    return app
}*/

/*const opts: FastifyServerOptions = {}
if (process.stdout.isTTY) {
    opts.logger = {
        transport: {
            target: 'pino-pretty'
        }
    }
} else {
    opts.logger = true;
}*/

export const fastify = FastifyInstance({ logger: true })

fastify.register(ProjectsRoute)

/*
const app = express()

app.use('/api/v1', ProjectsRoute)*/
