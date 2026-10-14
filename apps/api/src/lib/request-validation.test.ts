import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { SubjectQuerySchema, PageQuerySchema } from 'shared/schemas'

import { normalizeError, validateRequest } from './request-validation.js'
vi.mock('./prisma.js', () => ({ prisma: {} }))
function build() {
  const app = Fastify()
  app.addHook('preValidation', validateRequest)
  app.addHook('onSend', normalizeError)
  app.get('/api/v2/subjects', async (req) => req.query)
  app.get('/api/v2/activities', async (req) => req.query)
  app.post('/api/v2/images', async (req) => req.query)
  app.post('/api/v2/comments', async (req) => req.body)
  app.get('/legacy', async (_req, reply) =>
    reply.code(409).send({ success: false, error: { message: 'Conflict', code: 'CONFLICT' } }),
  )
  app.get('/http', async (_req, reply) =>
    reply.code(403).send({ success: false, error: { message: 'Forbidden', code: 'HTTP_ERROR' } }),
  )
  return app
}
describe('shared HTTP contracts', () => {
  it.each(['?page=0', '?limit=101', '?includeDeleted=invalid', '?q=one&q=two'])(
    'rejects malformed query %s',
    async (query) => {
      const app = build()
      const response = await app.inject(`/api/v2/subjects${query}`)
      expect(response.statusCode).toBe(400)
      expect(response.json()).toMatchObject({
        code: 'VALIDATION_ERROR',
        error: 'Invalid query parameters',
      })
      await app.close()
    },
  )
  it('accepts COVER for image uploads and rejects it as an activity type', async () => {
    const app = build()
    expect(
      (await app.inject({ method: 'POST', url: '/api/v2/images?type=COVER' })).statusCode,
    ).toBe(200)
    expect((await app.inject('/api/v2/activities?type=COVER')).statusCode).toBe(400)
    await app.close()
  })
  it('rejects invalid comment targets and whitespace bodies', async () => {
    const app = build()
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v2/comments',
          payload: { body: '  ', pageId: 'page' },
        })
      ).statusCode,
    ).toBe(400)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v2/comments',
          payload: { body: 'valid', pageId: 123 },
        })
      ).statusCode,
    ).toBe(400)
    await app.close()
  })
  it('normalizes legacy errors without changing the message', async () => {
    const app = build()
    expect((await app.inject('/legacy')).json()).toEqual({ error: 'Conflict', code: 'CONFLICT' })
    expect((await app.inject('/http')).json()).toEqual({ error: 'Forbidden', code: 'FORBIDDEN' })
    await app.close()
  })
  it('parses false consistently in the shared query schemas', () => {
    expect(SubjectQuerySchema.parse({ includeDeleted: 'false' }).includeDeleted).toBe(false)
    expect(PageQuerySchema.parse({ isDraft: 'false' }).isDraft).toBe(false)
    expect(SubjectQuerySchema.parse({ limit: 100 }).limit).toBe(100)
  })
})
