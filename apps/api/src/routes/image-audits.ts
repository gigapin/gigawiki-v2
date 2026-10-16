import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { apiError } from '../lib/admin-transaction.js'
import { imageAuditQueue } from '../lib/queue.js'
import type { auditImages } from '../lib/image-audit.js'

export async function imageAuditRoutes(app: FastifyInstance) {
  app.post(
    '/admin/images/audits',
    { config: { rateLimit: { max: 2, timeWindow: '1 minute' } } },
    async (req, reply) => {
      if (req.user.role !== 'ADMIN') throw apiError(403, 'Admin access required')
      const job = await imageAuditQueue.add('scan', { requestedBy: req.user.id })
      return reply.code(202).send({ id: job.id })
    },
  )
  app.get<{ Params: { id: string } }>('/admin/images/audits/:id', async (req) => {
    if (req.user.role !== 'ADMIN') throw apiError(403, 'Admin access required')
    const { page, limit } = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query)
    const job = await imageAuditQueue.getJob(req.params.id)
    if (!job) throw apiError(404, 'Report expired or not found')
    const state = await job.getState()
    if (state !== 'completed')
      return {
        state,
        ...(state === 'failed' ? { error: 'Image audit failed; retry the scan' } : {}),
      }
    const report = job.returnvalue as Awaited<ReturnType<typeof auditImages>>
    return {
      state,
      createdAt: report.createdAt,
      warnings: report.warnings,
      note: report.note,
      rows: report.rows.slice((page - 1) * limit, page * limit),
      total: report.rows.length,
      page,
      limit,
    }
  })
}
