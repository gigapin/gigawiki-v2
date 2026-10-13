import { randomUUID } from 'node:crypto'

import { afterAll, describe, expect, it } from 'vitest'
import type { Prisma } from '@prisma/client'

import '../../config/env.js'
import { prisma } from '../../lib/prisma.js'

import { buildDeletionPreview, executeUserDeletion } from './userDeletion.js'

// Opt-in only, after the migration has been applied by the operator. This suite
// works on the app database without truncation: ALL writes roll back, even if an
// assertion or deletion fails. Existing rows are never selected for mutation.
const enabled = process.env.RUN_SETTINGS_DB_TESTS === '1'
const rollback = new Error('rollback settings fixtures')
async function inRollback(work: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await prisma.$transaction(
      async (tx) => {
        await work(tx)
        throw rollback
      },
      { isolationLevel: 'Serializable', timeout: 20000 },
    )
  } catch (error) {
    if (error !== rollback) throw error
  }
}
async function fixtures(tx: Prisma.TransactionClient) {
  const prefix = `settings-test-${randomUUID()}`
  const createUser = (key: string, role: 'ADMIN' | 'GUEST') =>
    tx.user.create({
      data: {
        name: `${prefix}-${key}`,
        slug: `${prefix}-${key}`,
        email: `${prefix}-${key}@example.invalid`,
        role,
        password: 'not-a-real-password',
        emailConfirmed: true,
      },
    })
  const actor = await createUser('admin', 'ADMIN')
  const target = await createUser('target', 'GUEST')
  const other = await createUser('other', 'GUEST')
  const subject = await tx.subject.create({
    data: { name: `${prefix}-subject`, slug: `${prefix}-subject`, userId: target.id },
  })
  const emptySubject = await tx.subject.create({
    data: { name: `${prefix}-empty-subject`, slug: `${prefix}-empty-subject`, userId: target.id },
  })
  const project = await tx.project.create({
    data: {
      name: `${prefix}-project`,
      slug: `${prefix}-project`,
      userId: target.id,
      subjectId: subject.id,
    },
  })
  const emptyProject = await tx.project.create({
    data: {
      name: `${prefix}-empty-project`,
      slug: `${prefix}-empty-project`,
      userId: target.id,
      subjectId: emptySubject.id,
    },
  })
  const otherProject = await tx.project.create({
    data: {
      name: `${prefix}-other-project`,
      slug: `${prefix}-other-project`,
      userId: other.id,
      subjectId: subject.id,
    },
  })
  const section = await tx.section.create({
    data: { title: `${prefix}-section`, slug: `${prefix}-section`, projectId: project.id },
  })
  const page = (key: string, creator: string) =>
    tx.page.create({
      data: {
        title: `${prefix}-${key}`,
        slug: `${prefix}-${key}`,
        content: 'Temporary test content',
        sectionId: section.id,
        projectId: project.id,
        createdById: creator,
        updatedById: target.id,
        ownedById: target.id,
      },
    })
  const ownPage = await page('own-page', target.id)
  const otherPage = await page('other-page', other.id)
  const root = await tx.comment.create({
    data: { userId: target.id, pageId: otherPage.id, body: 'own root' },
  })
  const reply = await tx.comment.create({
    data: { userId: other.id, pageId: otherPage.id, parentId: root.id, body: 'other reply' },
  })
  const ownRevision = await tx.revision.create({
    data: {
      pageId: otherPage.id,
      sectionId: section.id,
      projectId: project.id,
      createdById: target.id,
      title: otherPage.title,
      slug: otherPage.slug,
      content: 'own revision',
      revisionNumber: 1,
    },
  })
  const otherRevision = await tx.revision.create({
    data: {
      pageId: otherPage.id,
      sectionId: section.id,
      projectId: project.id,
      createdById: other.id,
      title: otherPage.title,
      slug: otherPage.slug,
      content: 'other revision',
      revisionNumber: 2,
    },
  })
  const image = await tx.image.create({
    data: {
      name: 'temporary',
      url: '/temporary.webp',
      path: `${prefix}.webp`,
      type: 'AVATAR',
      createdById: target.id,
      updatedById: target.id,
    },
  })
  await tx.user.update({ where: { id: other.id }, data: { avatarId: image.id } })
  const invite = await tx.emailInvite.create({
    data: {
      email: `${prefix}-invite@example.invalid`,
      name: '',
      role: 'GUEST',
      sentById: target.id,
      expiresAt: new Date(Date.now() + 86400000),
    },
  })
  await tx.refreshToken.create({
    data: { userId: target.id, token: prefix, expiresAt: new Date(Date.now() + 86400000) },
  })
  return {
    actor,
    target,
    other,
    subject,
    emptySubject,
    project,
    emptyProject,
    otherProject,
    ownPage,
    otherPage,
    root,
    reply,
    ownRevision,
    otherRevision,
    image,
    invite,
  }
}
describe.skipIf(!enabled)('Settings on PostgreSQL (all writes rolled back)', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })
  it('deletes own content and preserves other pages, replies, assets and containers', async () => {
    let testEmail = ''
    await inRollback(async (tx) => {
      const f = await fixtures(tx)
      testEmail = f.actor.email
      const preview = await buildDeletionPreview(tx, f.target.id)
      expect(preview.counts.pages).toBe(1)
      expect(preview.counts.transferredSubjects).toBe(1)
      await executeUserDeletion(tx, f.target.id, f.actor.id, preview.fingerprint)
      expect(await tx.user.findUnique({ where: { id: f.target.id } })).toBeNull()
      expect(await tx.page.findUnique({ where: { id: f.ownPage.id } })).toBeNull()
      const preserved = await tx.page.findUnique({ where: { id: f.otherPage.id } })
      expect(preserved).toMatchObject({
        createdById: f.other.id,
        ownedById: f.actor.id,
        updatedById: f.actor.id,
        content: 'Temporary test content',
      })
      expect(await tx.comment.findUnique({ where: { id: f.reply.id } })).toMatchObject({
        userId: f.other.id,
        parentId: null,
      })
      expect(await tx.revision.findUnique({ where: { id: f.ownRevision.id } })).toBeNull()
      expect(await tx.revision.findUnique({ where: { id: f.otherRevision.id } })).not.toBeNull()
      expect(await tx.subject.findUnique({ where: { id: f.subject.id } })).toMatchObject({
        userId: f.actor.id,
      })
      expect(await tx.project.findUnique({ where: { id: f.otherProject.id } })).toMatchObject({
        userId: f.other.id,
      })
      expect(await tx.project.findUnique({ where: { id: f.emptyProject.id } })).toBeNull()
      expect(await tx.subject.findUnique({ where: { id: f.emptySubject.id } })).toBeNull()
      expect(await tx.image.findUnique({ where: { id: f.image.id } })).toMatchObject({
        createdById: f.actor.id,
        updatedById: f.actor.id,
      })
      expect(await tx.emailInvite.findUnique({ where: { id: f.invite.id } })).toMatchObject({
        sentById: f.actor.id,
      })
      expect(await tx.refreshToken.count({ where: { userId: f.target.id } })).toBe(0)
    })
    expect(await prisma.user.count({ where: { email: testEmail } })).toBe(0)
  })
  it('rejects a changed deletion preview before any destructive writes', async () => {
    await inRollback(async (tx) => {
      const f = await fixtures(tx)
      const preview = await buildDeletionPreview(tx, f.target.id)
      await tx.page.update({
        where: { id: f.otherPage.id },
        data: { title: `${f.otherPage.title}-changed` },
      })
      await expect(
        executeUserDeletion(tx, f.target.id, f.actor.id, preview.fingerprint),
      ).rejects.toMatchObject({ statusCode: 409 })
      expect(await tx.user.findUnique({ where: { id: f.target.id } })).not.toBeNull()
      expect(await tx.page.findUnique({ where: { id: f.ownPage.id } })).not.toBeNull()
    })
  })
  it('rolls back a password change and revocation together', async () => {
    await inRollback(async (tx) => {
      const f = await fixtures(tx)
      await tx.user.update({
        where: { id: f.target.id },
        data: { password: 'temporary-new-hash', authVersion: { increment: 1 } },
      })
      await tx.refreshToken.updateMany({
        where: { userId: f.target.id },
        data: { revokedAt: new Date() },
      })
      expect(await tx.user.findUnique({ where: { id: f.target.id } })).toMatchObject({
        authVersion: 1,
      })
      expect(await tx.refreshToken.count({ where: { userId: f.target.id, revokedAt: null } })).toBe(
        0,
      )
    })
  })
})
