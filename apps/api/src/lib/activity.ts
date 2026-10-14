import type { ActivityType, Prisma, ResourceType } from '@prisma/client'
import type { FastifyRequest } from 'fastify'

import { adminTransaction } from './admin-transaction.js'

export async function recordActivity(
  tx: Prisma.TransactionClient,
  request: FastifyRequest,
  resourceType: ResourceType,
  resourceId: string,
  type: ActivityType,
  details?: string,
) {
  const key = { PAGE: 'pageId', PROJECT: 'projectId', SECTION: 'sectionId', SUBJECT: 'subjectId' }[
    resourceType
  ]
  await tx.activity.create({
    data: {
      userId: request.user.id,
      type,
      resourceType,
      [key]: resourceId,
      details,
      ip: request.ip,
    },
  })
}
export async function auditedWrite<T extends { id: string }>(
  request: FastifyRequest,
  resourceType: ResourceType,
  type: ActivityType,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  targetId?: string,
) {
  return adminTransaction(async (tx) => {
    const result = await work(tx)
    await recordActivity(tx, request, resourceType, targetId ?? result.id, type)
    return result
  })
}
