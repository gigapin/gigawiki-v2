import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import * as argon2 from 'argon2'
import { wikiHTML } from 'wiki-content/server'

import { buildDeletionPreview, executeUserDeletion } from '../routes/users/userDeletion.js'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'
import authPlugin from '../plugins/auth.js'
import { registerRoutes } from '../routes/index.js'

vi.mock('../lib/queue.js', () => ({
  emailQueue: { add: vi.fn() },
  imageQueue: { add: vi.fn() },
  imageAuditQueue: { add: vi.fn(), getJob: vi.fn() },
}))
vi.mock('../lib/redis.js', () => ({
  redis: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn(), getdel: vi.fn() },
}))

const enabled = process.env.RUN_FEATURE_DB_TESTS === '1'
const prefix = `features-${randomUUID()}`
let app: FastifyInstance
const users: Record<string, { id: string; token: string; email: string }> = {}
let subjectId: string, projectId: string, sectionId: string, pageId: string
const pageSlug = prefix + '-page'
const request = (
  actor: string,
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  payload?: object,
) =>
  app.inject({
    url: '/api/v2' + url,
    method,
    headers: { authorization: `Bearer ${users[actor].token}` },
    ...(payload ? { payload } : {}),
  })

describe.skipIf(!enabled)('feature parity on disposable PostgreSQL', () => {
  beforeAll(async () => {
    if (new URL(env.DATABASE_URL).pathname !== '/gigawiki_test')
      throw new Error('Use a disposable gigawiki_test database')
    env.ENFORCE_CONTENT_ACCESS = true
    const password = await argon2.hash('Feature-test-password-123')
    app = Fastify()
    app.setErrorHandler((error, _request, reply) => {
      const value = error as { issues?: unknown; statusCode?: number; message?: string }
      return reply
        .code(value.issues ? 400 : (value.statusCode ?? 500))
        .send({ error: value.message })
    })
    await app.register(cookie)
    await app.register(authPlugin)
    registerRoutes(app)
    await app.ready()
    for (const [name, role] of Object.entries({
      admin: 'ADMIN',
      owner: 'EDITOR',
      other: 'EDITOR',
      guest: 'GUEST',
    } as const)) {
      const account = await prisma.user.create({
        data: {
          name: prefix + name,
          email: `${prefix}-${name}@example.invalid`,
          slug: prefix + name,
          password,
          emailConfirmed: true,
          role,
        },
      })
      users[name] = {
        id: account.id,
        email: account.email,
        token: app.jwt.sign({ id: account.id, email: account.email, role, authVersion: 0 }),
      }
    }
    const subject = await prisma.subject.create({
      data: { name: prefix, slug: prefix, userId: users.owner.id },
    })
    subjectId = subject.id
    const project = await prisma.project.create({
      data: { name: prefix, slug: prefix, userId: users.owner.id, subjectId },
    })
    projectId = project.id
    const section = await prisma.section.create({
      data: { title: prefix, slug: prefix, projectId },
    })
    sectionId = section.id
    const page = await prisma.page.create({
      data: {
        title: prefix,
        slug: pageSlug,
        content: '<p>Original</p>',
        sectionId,
        projectId,
        createdById: users.owner.id,
        updatedById: users.owner.id,
        ownedById: users.owner.id,
      },
    })
    pageId = page.id
  })
  afterAll(async () => {
    if (!enabled) return
    if (app) await app.close()
    await prisma.setting.deleteMany({ where: { key: 'COMMENTS_ENABLED' } })
    await prisma.page.deleteMany({ where: { slug: { startsWith: prefix } } })
    await prisma.subject.deleteMany({ where: { slug: { startsWith: prefix } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } })
    await prisma.$disconnect()
  })
  it('supports Subject tags and filters catalog counts before exposing names', async () => {
    expect((await request('owner', '/tags', 'POST', { subjectId, name: prefix })).statusCode).toBe(
      201,
    )
    const catalog = await request('guest', '/tags/catalog')
    // Read through HTTP, then make the ancestor private and check the same name disappears.
    expect(catalog?.statusCode).toBe(200)
    await prisma.subject.update({ where: { id: subjectId }, data: { visibility: 'PRIVATE' } })
    const hidden = await request('guest', `/tags/catalog?search=${prefix}`)
    expect(hidden.json().tags).toEqual([])
    await prisma.subject.update({ where: { id: subjectId }, data: { visibility: 'PUBLIC' } })
  })
  it('keeps project index and contributions scoped to accessible content', async () => {
    expect(
      (await request('owner', '/projects?scope=mine'))
        .json()
        .projects.map((p: { id: string }) => p.id),
    ).toContain(projectId)
    expect((await request('other', '/projects?scope=mine')).json().projects).toEqual([])
    expect((await request('owner', '/users/me/contributions')).json().pagesCreated).toBe(1)
    await prisma.subject.update({ where: { id: subjectId }, data: { visibility: 'PRIVATE' } })
    expect((await request('guest', '/projects?scope=accessible')).json().projects).toEqual([])
    await prisma.subject.update({ where: { id: subjectId }, data: { visibility: 'PUBLIC' } })
  })
  it('restores only deleted pages, preserving revision and comment data', async () => {
    const revision = await prisma.revision.create({
      data: {
        pageId,
        projectId,
        sectionId,
        createdById: users.owner.id,
        title: prefix,
        slug: pageSlug,
        content: 'Before',
        revisionNumber: 0,
      },
    })
    const comment = await prisma.comment.create({
      data: { pageId, userId: users.owner.id, body: 'Preserve' },
    })
    expect((await request('admin', `/pages/${pageSlug}`, 'DELETE')).statusCode).toBe(200)
    expect((await request('guest', '/admin/trash/pages')).statusCode).toBe(403)
    expect(
      (await request('admin', '/admin/trash/pages')).json().pages.map((p: { id: string }) => p.id),
    ).toContain(pageId)
    await prisma.section.update({ where: { id: sectionId }, data: { deletedAt: new Date() } })
    expect(
      (await request('admin', `/admin/trash/pages/${pageId}/restore`, 'POST', {})).statusCode,
    ).toBe(409)
    await prisma.section.update({ where: { id: sectionId }, data: { deletedAt: null } })
    expect(
      (await request('admin', `/admin/trash/pages/${pageId}/restore`, 'POST', {})).statusCode,
    ).toBe(200)
    expect(await prisma.revision.findUnique({ where: { id: revision.id } })).not.toBeNull()
    expect(await prisma.comment.findUnique({ where: { id: comment.id } })).not.toBeNull()
  })
  it('hides comments and blocks writes while allowing Admin moderation', async () => {
    await prisma.setting.upsert({
      where: { key: 'COMMENTS_ENABLED' },
      create: { key: 'COMMENTS_ENABLED', value: 'false' },
      update: { value: 'false' },
    })
    expect((await request('owner', `/pages/${pageSlug}/comments`)).json().comments).toEqual([])
    expect(
      (await request('owner', '/comments', 'POST', { pageId, body: 'Blocked' })).statusCode,
    ).toBe(403)
    const comment = await prisma.comment.findFirstOrThrow({ where: { pageId } })
    expect((await request('owner', `/comments/${comment.id}`, 'DELETE')).statusCode).toBe(403)
    expect((await request('admin', `/comments/${comment.id}`, 'DELETE')).statusCode).toBe(200)
    await prisma.setting.delete({ where: { key: 'COMMENTS_ENABLED' } })
  })
  it('does not suggest a hidden draft or restricted page as a neighbour', async () => {
    const hidden = await prisma.page.create({
      data: {
        title: 'hidden',
        slug: prefix + '-hidden',
        content: 'secret',
        position: 1,
        isDraft: true,
        sectionId,
        projectId,
        createdById: users.owner.id,
        updatedById: users.owner.id,
        ownedById: users.owner.id,
      },
    })
    expect((await request('guest', `/pages/${pageSlug}/navigation`)).json().next).toBeNull()
    expect((await request('owner', `/pages/${pageSlug}/navigation`)).json().next.id).toBe(hidden.id)
  })
  it('preserves text descriptions and sanitizes explicitly formatted descriptions', async () => {
    expect(
      (
        await request('owner', `/projects/${prefix}`, 'PATCH', { description: '<b>literal</b>' })
      ).json().description,
    ).toBe('<b>literal</b>')
    const result = await request('owner', `/projects/${prefix}`, 'PATCH', {
      descriptionFormat: 'html',
      description: '<p style="color:#ff0000">red<script>alert(1)</script></p>',
    })
    expect(result.statusCode).toBe(200)
    expect(result.json().description).not.toContain('script')
    expect(result.json().descriptionFormat).toBe('html')
    expect(wikiHTML('<html><body><p>à è</p></body></html>')).toBe('<p>à è</p>')
  })
  it('retains rich descriptions on newly created Subjects and Sections', async () => {
    const subject = await request('owner', '/subjects', 'POST', {
      name: prefix + ' rich',
      descriptionFormat: 'html',
      description: '<p><strong>Rich</strong></p>',
    })
    expect(subject.statusCode).toBe(201)
    expect(subject.json().descriptionFormat).toBe('html')
    const section = await request('owner', '/sections', 'POST', {
      projectId,
      title: prefix + ' rich',
      descriptionFormat: 'html',
      description: '<p><em>Rich</em></p>',
    })
    expect(section.statusCode).toBe(201)
    expect(section.json().descriptionFormat).toBe('html')
  })
  it('preserves another users Subject tags when deleting the owner account', async () => {
    const target = await prisma.user.create({
      data: {
        name: prefix + ' tagowner',
        slug: prefix + '-tagowner',
        email: prefix + '-tagowner@example.invalid',
        password: 'unused',
        role: 'EDITOR',
        emailConfirmed: true,
      },
    })
    const subject = await prisma.subject.create({
      data: { name: prefix + ' tagowned', slug: prefix + '-tagowned', userId: target.id },
    })
    const tag = await prisma.tag.create({
      data: { name: 'preserved', subjectId: subject.id, userId: users.other.id },
    })
    await prisma.$transaction(async (tx) => {
      const preview = await buildDeletionPreview(tx, target.id)
      expect(preview.counts.transferredSubjects).toBe(1)
      expect(preview.counts.subjects).toBe(0)
      await executeUserDeletion(tx, target.id, users.admin.id, preview.fingerprint)
    })
    expect((await prisma.subject.findUniqueOrThrow({ where: { id: subject.id } })).userId).toBe(
      users.admin.id,
    )
    expect(await prisma.tag.findUnique({ where: { id: tag.id } })).not.toBeNull()
  })
  it('enforces Admin creation, short-lived challenge, and initial-password gate', async () => {
    const input = {
      name: prefix + ' temporary',
      email: `${prefix}-temporary@example.invalid`,
      role: 'EDITOR',
      attestEmail: true,
    }
    expect((await request('guest', '/users', 'POST', input)).statusCode).toBe(403)
    expect(
      (await request('admin', '/users', 'POST', { ...input, attestEmail: false })).statusCode,
    ).toBe(400)
    const created = await request('admin', '/users', 'POST', input)
    expect(created.statusCode).toBe(200)
    const { user, temporaryPassword } = created.json()
    const login = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: input.email, password: temporaryPassword },
    })
    expect(login.json().requiresPasswordChange).toBe(true)
    expect(login.headers['set-cookie']).not.toEqual(
      expect.stringContaining('refreshToken=' + temporaryPassword),
    )
    const token = login.json().passwordChangeToken
    const claims = app.jwt.verify<{ exp: number; iat: number }>(token)
    expect(claims.exp - claims.iat).toBe(600)
    expect(
      (
        await app.inject({
          url: `/api/v2/pages/${pageSlug}`,
          headers: { authorization: `Bearer ${token}` },
        })
      ).statusCode,
    ).toBe(401)
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0)
    const changed = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/complete-initial-password',
      payload: { passwordChangeToken: token, newPassword: 'User-chosen-password-123' },
    })
    expect(changed.statusCode).toBe(200)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v2/auth/complete-initial-password',
          payload: { passwordChangeToken: token, newPassword: 'Another-password-123' },
        })
      ).statusCode,
    ).toBe(401)
    const normal = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: input.email, password: 'User-chosen-password-123' },
    })
    expect(normal.json().accessToken).toBeTruthy()
    expect(
      (await request('admin', `/users/${user.id}/temporary-password`, 'POST', {})).statusCode,
    ).toBe(409)
  })
  it('reissue invalidates prior challenges and expiry holds in development', async () => {
    const email = `${prefix}-pending@example.invalid`
    const created = (
      await request('admin', '/users', 'POST', {
        name: prefix + ' pending',
        email,
        role: 'GUEST',
        attestEmail: true,
      })
    ).json()
    const challenge = (
      await app.inject({
        method: 'POST',
        url: '/api/v2/auth/login',
        payload: { email, password: created.temporaryPassword },
      })
    ).json().passwordChangeToken
    const reissued = await request(
      'admin',
      `/users/${created.user.id}/temporary-password`,
      'POST',
      {},
    )
    expect(reissued.statusCode).toBe(200)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v2/auth/complete-initial-password',
          payload: { passwordChangeToken: challenge, newPassword: 'New-password-123' },
        })
      ).statusCode,
    ).toBe(401)
    await prisma.user.update({
      where: { id: created.user.id },
      data: { temporaryPasswordExpiresAt: new Date(0) },
    })
    const old = env.NODE_ENV
    env.NODE_ENV = 'development'
    try {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v2/auth/login',
            payload: { email, password: reissued.json().temporaryPassword },
          })
        ).statusCode,
      ).toBe(401)
    } finally {
      env.NODE_ENV = old
    }
  })
})
