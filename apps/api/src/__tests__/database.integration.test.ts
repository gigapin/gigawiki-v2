import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Prisma, PrismaClient } from '@prisma/client'
import Fastify, { type FastifyInstance, type InjectOptions } from 'fastify'
import cookie from '@fastify/cookie'
import * as argon2 from 'argon2'

import '../config/env.js'
import { env } from '../config/env.js'
import authPlugin from '../plugins/auth.js'
import { login, logout, refresh, register, forgotPassword, me } from '../routes/auth/authRoutes.js'
import {
  createPage,
  updatePage,
  deletePage,
  fetchPage,
  fetchPagesBySection,
  searchPages,
} from '../routes/pages/pagesRoute.js'
import {
  fetchRevisions,
  fetchRevision,
  restoreRevision,
} from '../routes/revisions/revisionsRoute.js'

// Opt-in against the configured app DB. Every request uses a real PostgreSQL
// transaction; no migrations, truncate, seed, or committed fixture writes.
const scope = vi.hoisted(() => ({
  tx: null as Prisma.TransactionClient | null,
  prefix: '',
  savepoint: 0,
}))
vi.mock('../lib/prisma.js', () => ({
  prisma: new Proxy(
    {},
    {
      get(_target, key) {
        const tx = scope.tx
        if (!tx) throw new Error('Integration DB access outside rollback transaction')
        if (key === '$transaction')
          return async (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
            // Route transactions are nested inside the rollback fixture transaction.
            const name = `route_${++scope.savepoint}`
            await tx.$executeRawUnsafe(`SAVEPOINT ${name}`)
            try {
              const result = await work(tx)
              await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`)
              return result
            } catch (error) {
              await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`)
              await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`)
              throw error
            }
          }
        if (key === 'setting')
          return {
            // Singleton policies point to random fixture keys, leaving app settings
            // untouched. Policy values are still read through actual Prisma SQL.
            findUnique: (args: { where: { key: string } }) =>
              tx.setting.findUnique({
                ...args,
                where: { key: `${scope.prefix}-${args.where.key}` },
              }),
          }
        const value = Reflect.get(tx, key)
        return typeof value === 'function' ? value.bind(tx) : value
      },
    },
  ),
}))
vi.mock('../lib/redis.js', () => ({ redis: { set: vi.fn().mockResolvedValue('OK') } }))
vi.mock('../lib/queue.js', () => ({ emailQueue: { add: vi.fn().mockResolvedValue(undefined) } }))

let database: PrismaClient | undefined
const enabled = process.env.RUN_INTEGRATION_DB_TESTS === '1'
const rollback = new Error('rollback integration fixtures')
const password = 'Integration-password-123'
let passwordHash: string

async function inRollback(work: (tx: Prisma.TransactionClient) => Promise<void>) {
  if (!database) throw new Error('Integration database not initialized')
  const prefix = `gw${randomUUID().replaceAll('-', '')}`
  try {
    await database.$transaction(
      async (tx) => {
        scope.tx = tx
        scope.prefix = prefix
        try {
          await work(tx)
          throw rollback
        } finally {
          scope.tx = null
        }
      },
      { isolationLevel: 'Serializable', timeout: 30000 },
    )
  } catch (error) {
    if (error !== rollback) throw error
  }
  // Prove fixture cleanup through the original connection, outside the rollback.
  expect(await database.user.count({ where: { email: { startsWith: prefix } } })).toBe(0)
  expect(await database.subject.count({ where: { slug: { startsWith: prefix } } })).toBe(0)
  expect(await database.page.count({ where: { title: { contains: prefix } } })).toBe(0)
  expect(await database.setting.count({ where: { key: { startsWith: prefix } } })).toBe(0)
}
async function fixtures(tx: Prisma.TransactionClient) {
  const prefix = scope.prefix
  const actor = await tx.user.create({
    data: {
      name: prefix,
      slug: prefix,
      email: `${prefix}@example.invalid`,
      password: passwordHash,
      role: 'ADMIN',
      emailConfirmed: true,
    },
  })
  const subject = await tx.subject.create({
    data: { name: prefix, slug: prefix, userId: actor.id },
  })
  const project = await tx.project.create({
    data: { name: prefix, slug: prefix, subjectId: subject.id, userId: actor.id },
  })
  const section = await tx.section.create({
    data: { title: prefix, slug: prefix, projectId: project.id },
  })
  await tx.setting.createMany({
    data: [
      { key: `${prefix}-ALLOW_SELF_REGISTRATION`, value: 'true' },
      { key: `${prefix}-DEFAULT_USER_ROLE`, value: 'EDITOR' },
    ],
  })
  return { actor, subject, project, section }
}
async function buildApp() {
  const app = Fastify()
  app.register(cookie)
  app.register(authPlugin)
  app.register(
    async (instance) => {
      for (const route of [login, logout, refresh, register, forgotPassword, me])
        instance.register(route)
      instance.register(async (protectedRoutes) => {
        protectedRoutes.addHook('preHandler', protectedRoutes.authenticate)
        for (const route of [
          createPage,
          updatePage,
          deletePage,
          fetchPage,
          fetchPagesBySection,
          searchPages,
          fetchRevisions,
          fetchRevision,
          restoreRevision,
        ])
          protectedRoutes.register(route)
      })
    },
    { prefix: '/api/v2' },
  )
  await app.ready()
  return app
}
async function withApp(
  work: (
    app: FastifyInstance,
    tx: Prisma.TransactionClient,
    fixture: Awaited<ReturnType<typeof fixtures>>,
  ) => Promise<void>,
) {
  await inRollback(async (tx) => {
    const fixture = await fixtures(tx)
    const app = await buildApp()
    try {
      await work(app, tx, fixture)
    } finally {
      await app.close()
    }
  })
}
async function request(app: FastifyInstance, options: InjectOptions) {
  const tx = scope.tx!
  const name = `request_${++scope.savepoint}`
  await tx.$executeRawUnsafe(`SAVEPOINT ${name}`)
  const response = await app.inject(options)
  // An expected unique-constraint failure otherwise leaves the outer PG
  // transaction aborted. Each failed request gets its own rollback boundary.
  if (response.statusCode >= 400) await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`)
  await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`)
  return response
}
async function signIn(app: FastifyInstance, email: string) {
  const response = await request(app, {
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password },
  })
  expect(response.statusCode).toBe(200)
  return { authorization: `Bearer ${response.json().accessToken}` }
}

// Serial tests are necessary: the route facade binds one rollback transaction.
describe.skipIf(!enabled)('API integration on PostgreSQL (all writes rolled back)', () => {
  beforeAll(async () => {
    env.NODE_ENV = 'test'
    const original = await vi.importActual<typeof import('../lib/prisma.js')>('../lib/prisma.js')
    database = original.prisma
    passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 8192,
      timeCost: 2,
    })
  })
  afterAll(async () => {
    await database?.$disconnect()
  })

  it('authenticates real password hashes and rejects bad or unknown credentials', async () => {
    await withApp(async (app, _tx, { actor }) => {
      const headers = await signIn(app, actor.email)
      const current = await request(app, { url: '/api/v2/auth/me', headers })
      expect(current.statusCode).toBe(200)
      expect(current.json().user.id).toBe(actor.id)
      expect(current.json().user.password).toBeUndefined()
      expect((await request(app, { url: '/api/v2/auth/me' })).statusCode).toBe(401)
      for (const input of [
        { email: actor.email, password: 'wrong' },
        { email: `${scope.prefix}-missing@example.invalid`, password },
      ]) {
        expect(
          (await request(app, { method: 'POST', url: '/api/v2/auth/login', payload: input }))
            .statusCode,
        ).toBe(401)
      }
    })
  })
  it('rotates refresh tokens, rejects replay, and revokes the replacement on logout', async () => {
    await withApp(async (app, tx, { actor }) => {
      await signIn(app, actor.email)
      const original = await tx.refreshToken.findFirstOrThrow({ where: { userId: actor.id } })
      const refreshResponse = await request(app, {
        method: 'POST',
        url: '/api/v2/auth/refresh',
        cookies: { refreshToken: original.token },
      })
      expect(refreshResponse.statusCode).toBe(200)
      expect(await tx.refreshToken.findUnique({ where: { id: original.id } })).toBeNull()
      const next = await tx.refreshToken.findFirstOrThrow({ where: { userId: actor.id } })
      expect(next.token).not.toBe(original.token)
      expect(
        (
          await request(app, {
            method: 'POST',
            url: '/api/v2/auth/refresh',
            cookies: { refreshToken: original.token },
          })
        ).statusCode,
      ).toBe(401)
      expect(
        (
          await request(app, {
            method: 'POST',
            url: '/api/v2/auth/logout',
            cookies: { refreshToken: next.token },
          })
        ).statusCode,
      ).toBe(204)
      expect(
        (await tx.refreshToken.findUniqueOrThrow({ where: { id: next.id } })).revokedAt,
      ).not.toBeNull()
      expect(
        (
          await request(app, {
            method: 'POST',
            url: '/api/v2/auth/refresh',
            cookies: { refreshToken: next.token },
          })
        ).statusCode,
      ).toBe(401)
    })
  })
  it('rejects expired refresh tokens and stale auth versions', async () => {
    await withApp(async (app, tx, { actor }) => {
      const headers = await signIn(app, actor.email)
      const stored = await tx.refreshToken.findFirstOrThrow({ where: { userId: actor.id } })
      await tx.refreshToken.update({ where: { id: stored.id }, data: { expiresAt: new Date(0) } })
      expect(
        (
          await request(app, {
            method: 'POST',
            url: '/api/v2/auth/refresh',
            cookies: { refreshToken: stored.token },
          })
        ).statusCode,
      ).toBe(401)
      await tx.user.update({ where: { id: actor.id }, data: { authVersion: { increment: 1 } } })
      expect((await request(app, { url: '/api/v2/auth/me', headers })).statusCode).toBe(401)
    })
  })
  it('registers an unverified account using the fixture policy and returns 409 on duplicate email', async () => {
    await withApp(async (app, tx) => {
      const input = {
        name: `${scope.prefix}-signup`,
        email: `${scope.prefix}-signup@example.invalid`,
        password,
      }
      expect(
        (await request(app, { method: 'POST', url: '/api/v2/auth/register', payload: input }))
          .statusCode,
      ).toBe(201)
      const account = await tx.user.findUniqueOrThrow({ where: { email: input.email } })
      expect(account.role).toBe('EDITOR')
      expect(account.emailConfirmed).toBe(false)
      expect(await argon2.verify(account.password, password)).toBe(true)
      expect(
        (await request(app, { method: 'POST', url: '/api/v2/auth/register', payload: input }))
          .statusCode,
      ).toBe(409)
      expect(
        (
          await request(app, {
            method: 'POST',
            url: '/api/v2/auth/login',
            payload: { email: input.email, password },
          })
        ).statusCode,
      ).toBe(403)
    })
  })
  it('honors disabled registration and keeps forgot-password responses neutral', async () => {
    await withApp(async (app, tx, { actor }) => {
      await tx.setting.update({
        where: { key: `${scope.prefix}-ALLOW_SELF_REGISTRATION` },
        data: { value: 'false' },
      })
      expect(
        (
          await request(app, {
            method: 'POST',
            url: '/api/v2/auth/register',
            payload: {
              name: scope.prefix,
              email: `${scope.prefix}-signup@example.invalid`,
              password,
            },
          })
        ).statusCode,
      ).toBe(403)
      for (const email of [actor.email, `${scope.prefix}-missing@example.invalid`]) {
        expect(
          (
            await request(app, {
              method: 'POST',
              url: '/api/v2/auth/forgot-password',
              payload: { email },
            })
          ).statusCode,
        ).toBe(200)
      }
    })
  })
  it('creates a page, snapshots revisions 0 and 1, and restores revision 0 as revision 2', async () => {
    await withApp(async (app, tx, { actor, section }) => {
      const headers = await signIn(app, actor.email)
      const created = await request(app, {
        method: 'POST',
        url: '/api/v2/pages',
        headers,
        payload: {
          title: `${scope.prefix} First`,
          content: '<p>Original</p>',
          sectionId: section.id,
        },
      })
      expect(created.statusCode).toBe(201)
      const page = created.json()
      expect(page.currentRevision).toBe(0)
      expect(await tx.revision.count({ where: { pageId: page.id } })).toBe(0)
      for (const content of ['<p>Second</p>', '<p>Third</p>']) {
        expect(
          (
            await request(app, {
              method: 'PATCH',
              url: `/api/v2/pages/${page.slug}`,
              headers,
              payload: { content },
            })
          ).statusCode,
        ).toBe(200)
      }
      const snapshots = await tx.revision.findMany({
        where: { pageId: page.id },
        orderBy: { revisionNumber: 'asc' },
      })
      expect(snapshots.map((item) => [item.revisionNumber, item.content])).toEqual([
        [0, '<p>Original</p>'],
        [1, '<p>Second</p>'],
      ])
      const restored = await request(app, {
        method: 'POST',
        url: `/api/v2/pages/${page.slug}/revisions/0/restore`,
        headers,
      })
      expect(restored.statusCode).toBe(200)
      expect(restored.json().currentRevision).toBe(3)
      expect((await tx.page.findUniqueOrThrow({ where: { id: page.id } })).content).toBe(
        '<p>Original</p>',
      )
      expect(
        (await tx.revision.findFirstOrThrow({ where: { pageId: page.id, revisionNumber: 2 } }))
          .content,
      ).toBe('<p>Third</p>')
    })
  })
  it('updates full-text search after editing and excludes soft-deleted pages from search/list/detail', async () => {
    await withApp(async (app, tx, { actor, section }) => {
      const headers = await signIn(app, actor.email)
      const created = await request(app, {
        method: 'POST',
        url: '/api/v2/pages',
        headers,
        payload: {
          title: `${scope.prefix} TypeScript guide`,
          content: 'Original',
          sectionId: section.id,
        },
      })
      expect(created.statusCode).toBe(201)
      const page = created.json()
      const search = (term: string) =>
        request(app, {
          url: `/api/v2/search?q=${encodeURIComponent(`${term} ${scope.prefix}`)}`,
          headers,
        })
      const found = await search('typescript')
      expect(found.statusCode).toBe(200)
      expect(found.json().results.map((item: { id: string }) => item.id)).toContain(page.id)
      expect((await search('python')).json().results).toEqual([])
      const updated = await request(app, {
        method: 'PATCH',
        url: `/api/v2/pages/${page.slug}`,
        headers,
        payload: { title: `${scope.prefix} Python guide` },
      })
      expect(updated.statusCode).toBe(200)
      expect((await search('typescript')).json().results).toEqual([])
      expect(
        (await search('python')).json().results.map((item: { id: string }) => item.id),
      ).toContain(page.id)
      expect(
        (
          await request(app, {
            method: 'DELETE',
            url: `/api/v2/pages/${updated.json().slug}`,
            headers,
          })
        ).statusCode,
      ).toBe(200)
      expect((await tx.page.findUniqueOrThrow({ where: { id: page.id } })).deletedAt).not.toBeNull()
      expect((await search('python')).json().results).toEqual([])
      expect(
        (await request(app, { url: `/api/v2/sections/${section.slug}/pages`, headers })).json()
          .pages,
      ).toEqual([])
      expect(
        (await request(app, { url: `/api/v2/pages/${updated.json().slug}`, headers })).statusCode,
      ).toBe(404)
    })
  })
  it('uses the current database role for write and revision permissions', async () => {
    await withApp(async (app, tx, { actor, section }) => {
      const headers = await signIn(app, actor.email)
      const created = await request(app, {
        method: 'POST',
        url: '/api/v2/pages',
        headers,
        payload: { title: `${scope.prefix} Roles`, sectionId: section.id },
      })
      expect(created.statusCode).toBe(201)
      const slug = created.json().slug
      await tx.user.update({ where: { id: actor.id }, data: { role: 'GUEST' } })
      expect(
        (
          await request(app, {
            method: 'PATCH',
            url: `/api/v2/pages/${slug}`,
            headers,
            payload: { content: 'No' },
          })
        ).statusCode,
      ).toBe(403)
      expect(
        (await request(app, { url: `/api/v2/pages/${slug}/revisions`, headers })).statusCode,
      ).toBe(403)
      expect((await request(app, { url: `/api/v2/pages/${slug}`, headers })).statusCode).toBe(200)
    })
  })
})
