/* eslint-disable no-console */
import { prisma } from '../lib/prisma.js'
try {
  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.deleteMany()
    await tx.user.updateMany({ data: { authVersion: { increment: 1 } } })
  })
  console.log(
    'Sessions invalidated. Users must sign in again; login clears their local query cache.',
  )
} finally {
  await prisma.$disconnect()
}
