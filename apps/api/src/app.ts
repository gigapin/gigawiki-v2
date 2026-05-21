import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { ZodError } from 'zod'

import { env } from './config/env.js'
import helmetPlugin from './plugins/helmet.js'
import corsPlugin from './plugins/cors.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import authJwtPlugin from './plugins/auth.js'
import multipartPlugin from './plugins/multipart.js'
import { registerRoutes } from './routes/index.js'

export const app = Fastify({ logger: true })

// ── Plugins (order matters) ───────────────────────────────────────
app.register(helmetPlugin)
app.register(corsPlugin)
app.register(cookie)
app.register(rateLimitPlugin)
app.register(authJwtPlugin)
app.register(multipartPlugin)

// ── Health check ─────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }))

// ── Global error handler ─────────────────────────────────────────
app.setErrorHandler((error, _request, reply) => {
  // Zod validation error
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.issues },
    })
  }

  // Prisma known request errors — duck-type on `code`
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: { code: 'CONFLICT', message: 'A record with that value already exists' },
      })
    }
    if (error.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Record not found' },
      })
    }
  }

  // Fastify HTTP errors (e.g. 401 from JWT plugin)
  const statusCode =
    error && typeof error === 'object' && 'statusCode' in error
      ? (error as { statusCode: number }).statusCode
      : undefined
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'

  if (statusCode) {
    return reply.status(statusCode).send({
      success: false,
      error: { code: 'HTTP_ERROR', message },
    })
  }

  if (error instanceof Error) reply.log.error(error)
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  })
})

// ── Routes ────────────────────────────────────────────────────────
registerRoutes(app)

// Expose env for use in server.ts
export { env }
