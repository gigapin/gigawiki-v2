import type { Prisma } from '@prisma/client'

import { prisma } from './prisma.js'

export function apiError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode })
}

// Serializable isolation protects the last-Admin invariant and deletion previews.
export async function adminTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: 'Serializable', timeout: 20000 })
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2034') throw error
      if (attempt >= 2) throw apiError(409, 'Data changed concurrently. Please try again.')
    }
  }
}
export async function requireAdmin(tx: Prisma.TransactionClient, id: string) {
  const actor = await tx.user.findUnique({ where: { id } })
  if (actor?.role !== 'ADMIN') throw apiError(403, 'Admin access required')
}
export async function protectLastAdmin(tx: Prisma.TransactionClient, id: string) {
  const user = await tx.user.findUnique({ where: { id } })
  if (!user) throw apiError(404, 'User not found')
  if (user.role === 'ADMIN' && (await tx.user.count({ where: { role: 'ADMIN' } })) <= 1)
    throw apiError(409, 'The last administrator cannot be removed or demoted.')
  return user
}
