import { prisma } from './prisma.js'
import { apiError } from './admin-transaction.js'

export async function commentsEnabled() {
  const setting = await prisma.setting.findUnique({ where: { key: 'COMMENTS_ENABLED' } })
  return setting?.value !== 'false'
}
export async function requireCommentsEnabled() {
  if (!(await commentsEnabled()))
    throw Object.assign(apiError(403, 'Comments are disabled'), { code: 'COMMENTS_DISABLED' })
}
