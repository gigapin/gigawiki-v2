import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import { contentContext, modelAccess, scopeRelations } from './content-access.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    $allModels: {
      $allOperations({ model, operation, args, query }) {
        const request = contentContext.getStore()?.request
        const route = request?.routeOptions.url ?? ''
        const accountManagement =
          /^\/(api\/v2\/)?users(\/|$)/.test(route) && !route.endsWith('/activities')
        if (
          !accountManagement &&
          request?.user?.id &&
          ['findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(operation)
        ) {
          const includeDeleted =
            request.user.role === 'ADMIN' &&
            (request.query as { includeDeleted?: string })?.includeDeleted === 'true'
          const filter = modelAccess(model, request.user, includeDeleted)
          if (filter) {
            const scoped = { ...args } as Record<string, unknown>
            if (scoped.select) scoped.select = structuredClone(scoped.select)
            if (scoped.include) scoped.include = structuredClone(scoped.include)
            scoped.where = { AND: [scoped.where ?? {}, filter] }
            scopeRelations(model, scoped, request.user)
            return query(scoped as typeof args)
          }
        }
        return query(args)
      },
    },
  },
}) as unknown as PrismaClient
