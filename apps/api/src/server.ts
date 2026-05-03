/*
import { build } from './app';
import { FastifyServerOptions } from "fastify";

const opts: FastifyServerOptions = {
    logger: {
        level: 'info',
        transport: process.stdout.isTTY ? { target: 'pino-pretty' } : undefined
    }
}

const app = await build(opts)
await app.listen({ port: 3001, host: '0.0.0.0' })*/
import { fastify } from './app'

await fastify.listen({ port: 3001, host: '0.0.0.0' })
