import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  ResourceTargetSchema,
  CreateCommentSchema,
  UpdateCommentSchema,
  CreateTagSchema,
  CreateSubjectSchema,
  UpdateSubjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateSectionSchema,
  UpdateSectionSchema,
  ReorderSectionsSchema,
  CreatePageSchema,
  UpdatePageSchema,
  RequestQuerySchema,
} from 'shared/schemas'

import { env } from '../config/env.js'

import { prisma } from './prisma.js'
import { apiError } from './admin-transaction.js'

export async function validateRequest(request: FastifyRequest, reply: FastifyReply) {
  const parsed = RequestQuerySchema.safeParse(request.query)
  if (!parsed.success)
    return reply.code(400).send({
      error: 'Invalid query parameters',
      code: 'VALIDATION_ERROR',
      details: parsed.error.issues,
    })
  const route = (request.routeOptions.url ?? '').replace('/api/v2', '')
  if (originalTypeInvalid(route, (request.query as { type?: string }).type))
    return reply.code(400).send({ error: 'Invalid resource type', code: 'VALIDATION_ERROR' })
  const schemas = {
    '/subjects': CreateSubjectSchema,
    '/subjects/:slug': UpdateSubjectSchema,
    '/projects': CreateProjectSchema,
    '/projects/:slug': UpdateProjectSchema,
    '/sections': CreateSectionSchema,
    '/sections/:slug': UpdateSectionSchema,
    '/sections/:slug/position': ReorderSectionsSchema,
    '/favorites': ResourceTargetSchema,
    '/comments': CreateCommentSchema,
    '/comments/:id': UpdateCommentSchema,
    '/tags': CreateTagSchema,
    '/pages': CreatePageSchema,
    '/pages/:slug': UpdatePageSchema,
  }
  if (['POST', 'PATCH', 'PUT'].includes(request.method) && route in schemas) {
    const body = schemas[route as keyof typeof schemas].safeParse(request.body)
    if (!body.success)
      return reply
        .code(400)
        .send({ error: 'Invalid fields', code: 'VALIDATION_ERROR', details: body.error.issues })
    request.body = body.data
  }
  // Keep query strings stable for existing handlers while sharing the validator.
  const original = request.query as Record<string, unknown>
  for (const key of Object.keys(original))
    if (key in parsed.data) original[key] = String(parsed.data[key])
  const body = request.body as Record<string, unknown> | undefined
  if (
    body?.expectedRevision !== undefined &&
    (!Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 0)
  )
    return reply.code(400).send({ error: 'Invalid expected revision', code: 'VALIDATION_ERROR' })
}
export async function guardContentRequest(request: FastifyRequest) {
  const query = request.query as { includeDeleted?: string }
  if (query.includeDeleted === 'true' && request.user.role !== 'ADMIN')
    throw apiError(403, 'Admin access required')
  if (['GET', 'HEAD'].includes(request.method)) return
  const body = request.body as Record<string, unknown> | undefined
  const route = (request.routeOptions.url ?? '').replace('/api/v2', '')
  if (request.user.role === 'GUEST' && /^\/(subjects|projects|sections|pages)(\/|$)/.test(route))
    throw apiError(403, 'Editor or Admin role required')
  const keys = ['subjectId', 'projectId', 'sectionId', 'pageId'] as const
  for (const key of keys) {
    if (typeof body?.[key] !== 'string') continue
    const id = body[key] as string
    const record =
      key === 'subjectId'
        ? await prisma.subject.findFirst({ where: { id } })
        : key === 'projectId'
          ? await prisma.project.findFirst({ where: { id } })
          : key === 'sectionId'
            ? await prisma.section.findFirst({ where: { id } })
            : await prisma.page.findFirst({ where: { id } })
    if (!record) throw apiError(404, 'Resource not found')
  }
  const params = request.params as Record<string, string>
  const path = request.routeOptions.url ?? ''
  if (path.startsWith('/api/v2/pages/') && params.slug) {
    const page = await prisma.page.findFirst({ where: { slug: params.slug } })
    if (!page) throw apiError(404, 'Page not found')
    if (body?.ownedById !== undefined && request.user.role !== 'ADMIN')
      throw apiError(403, 'Only Admin can transfer ownership')
    if (
      env.ENFORCE_CONTENT_ACCESS &&
      page.restricted &&
      request.user.role !== 'ADMIN' &&
      page.ownedById !== request.user.id
    )
      throw apiError(403, 'Restricted page')
    if (
      body?.restricted !== undefined &&
      body.restricted !== page.restricted &&
      request.user.role !== 'ADMIN' &&
      page.ownedById !== request.user.id
    )
      throw apiError(403, 'Only the owner or Admin can change restrictions')
  }
}

export async function normalizeError(
  _request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown,
) {
  if (reply.statusCode < 400 || typeof payload !== 'string') return payload
  try {
    const value = JSON.parse(payload)
    const nested = typeof value.error === 'object' && value.error ? value.error : undefined
    const codes: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'RATE_LIMITED',
    }
    return JSON.stringify({
      error: nested?.message ?? value.message ?? value.error ?? 'Request failed',
      code:
        (nested?.code === 'HTTP_ERROR' ? undefined : nested?.code) ??
        value.code ??
        codes[reply.statusCode] ??
        'INTERNAL_ERROR',
      ...((nested?.details ?? value.details) ? { details: nested?.details ?? value.details } : {}),
    })
  } catch {
    return payload
  }
}

function originalTypeInvalid(route: string, type?: string) {
  if (!type) return false
  if (route === '/images') return !['AVATAR', 'INLINE', 'COVER'].includes(type)
  if (route.endsWith('/activities') || route.endsWith('/activity'))
    return !['CREATED', 'UPDATED', 'DELETED', 'COMMENTED', 'REPLIED', 'RESTORED'].includes(type)
  return false
}
