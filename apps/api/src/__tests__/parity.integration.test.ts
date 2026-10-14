import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'

import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { contentContext } from '../lib/content-access.js'
import { validateRequest, normalizeError, guardContentRequest } from '../lib/request-validation.js'
import { fetchPage, updatePage, searchPages } from '../routes/pages/pagesRoute.js'
import { fetchPageComments, createComment } from '../routes/comments/commentsRoute.js'
import { fetchFavorites } from '../routes/favorites/favoritesRoute.js'
import { fetchUserActivities } from '../routes/activities/activitiesRoute.js'
import { fetchAllSubjects } from '../routes/subjects/subjectsRoute.js'
import { dashboardStats } from '../routes/dashboard.js'

const enabled = process.env.RUN_PARITY_DB_TESTS === '1'
const prefix = `parity-${randomUUID()}`
let app: FastifyInstance
let ids: {
  owner: string
  editor: string
  guest: string
  admin: string
  subject: string
  project: string
  section: string
  page: string
}
const actorRoles = { owner: 'EDITOR', editor: 'EDITOR', guest: 'GUEST', admin: 'ADMIN' } as const
function request(
  actor: keyof typeof actorRoles,
  url: string,
  method: 'GET' | 'PATCH' | 'POST' = 'GET',
  payload?: object,
) {
  return app.inject({ url, method, headers: { 'x-actor': actor }, ...(payload ? { payload } : {}) })
}
describe.skipIf(!enabled)('parity on a disposable database', () => {
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('/gigawiki_test'))
      throw new Error('Parity tests require disposable gigawiki_test')
    env.ENFORCE_CONTENT_ACCESS = true
    const users = await Promise.all(
      Object.entries(actorRoles).map(async ([actor, role]) =>
        prisma.user.create({
          data: {
            name: prefix + actor,
            slug: prefix + actor,
            email: `${prefix}-${actor}@example.invalid`,
            password: 'unused',
            role,
          },
        }),
      ),
    )
    const subject = await prisma.subject.create({
      data: { name: prefix, slug: prefix, userId: users[0].id },
    })
    const project = await prisma.project.create({
      data: { name: prefix, slug: prefix, userId: users[0].id, subjectId: subject.id },
    })
    const section = await prisma.section.create({
      data: { title: prefix, slug: prefix, projectId: project.id },
    })
    const page = await prisma.page.create({
      data: {
        title: 'Parityneedle',
        slug: prefix,
        content: 'initial',
        sectionId: section.id,
        projectId: project.id,
        ownedById: users[0].id,
        createdById: users[0].id,
        updatedById: users[0].id,
      },
    })
    ids = {
      owner: users[0].id,
      editor: users[1].id,
      guest: users[2].id,
      admin: users[3].id,
      subject: subject.id,
      project: project.id,
      section: section.id,
      page: page.id,
    }
    app = Fastify()
    app.addHook('onRequest', (req, _reply, done) => contentContext.run({ request: req }, done))
    app.addHook('preValidation', validateRequest)
    app.addHook('onSend', normalizeError)
    app.addHook('preHandler', async (req) => {
      const actor = req.headers['x-actor'] as keyof typeof actorRoles
      req.user = { id: ids[actor], role: actorRoles[actor], email: 'test@example.invalid' }
    })
    app.addHook('preHandler', guardContentRequest)
    app.setErrorHandler((error, _req, reply) =>
      reply
        .code((error as { statusCode?: number }).statusCode ?? 500)
        .send({ error: (error as Error).message }),
    )
    app.register(fetchPage)
    app.register(updatePage)
    app.register(searchPages)
    app.register(fetchPageComments)
    app.register(createComment)
    app.register(fetchFavorites)
    app.register(fetchUserActivities)
    app.register(fetchAllSubjects)
    app.register(dashboardStats)
    await app.ready()
  })
  afterAll(async () => {
    env.ENFORCE_CONTENT_ACCESS = false
    await app?.close()
    if (ids) {
      await prisma.page.deleteMany({ where: { id: ids.page } })
      await prisma.subject.deleteMany({ where: { id: ids.subject } })
      await prisma.user.deleteMany({
        where: { id: { in: [ids.owner, ids.editor, ids.guest, ids.admin] } },
      })
    }
    await prisma.$disconnect()
  })
  it('validates pagination and Admin stats', async () => {
    expect((await request('owner', '/subjects?limit=101')).statusCode).toBe(400)
    expect((await request('owner', '/subjects?includeDeleted=true')).statusCode).toBe(403)
    expect((await request('owner', '/dashboard/stats')).statusCode).toBe(403)
    const response = await request('admin', '/dashboard/stats')
    expect(response.json()).toMatchObject({ users: 4, pages: 1, subjects: 1 })
  })
  it('isolates concurrent requests and enforces PRIVATE, restricted and drafts', async () => {
    await prisma.page.update({
      where: { id: ids.page },
      data: { visibility: 'PRIVATE', restricted: true },
    })
    const responses = await Promise.all([
      request('owner', `/pages/${prefix}`),
      request('editor', `/pages/${prefix}`),
      request('admin', `/pages/${prefix}`),
    ])
    expect(responses.map((response) => response.statusCode)).toEqual([200, 404, 200])
    await prisma.page.update({
      where: { id: ids.page },
      data: { visibility: 'PUBLIC', restricted: false, isDraft: true },
    })
    expect((await request('guest', `/pages/${prefix}`)).statusCode).toBe(404)
    expect((await request('editor', `/pages/${prefix}`)).statusCode).toBe(200)
    await prisma.page.update({ where: { id: ids.page }, data: { isDraft: false } })
  })
  it('inherits PRIVATE constraints from Project and Section', async () => {
    await prisma.section.update({ where: { id: ids.section }, data: { visibility: 'PRIVATE' } })
    expect((await request('owner', `/pages/${prefix}`)).statusCode).toBe(200)
    expect((await request('editor', `/pages/${prefix}`)).statusCode).toBe(404)
    await prisma.section.update({ where: { id: ids.section }, data: { visibility: 'PUBLIC' } })
    await prisma.project.update({ where: { id: ids.project }, data: { visibility: 'PRIVATE' } })
    await prisma.page.update({ where: { id: ids.page }, data: { ownedById: ids.editor } })
    expect((await request('editor', `/pages/${prefix}`)).statusCode).toBe(404)
    expect((await request('admin', `/pages/${prefix}`)).statusCode).toBe(200)
    await prisma.project.update({ where: { id: ids.project }, data: { visibility: 'PUBLIC' } })
    await prisma.page.update({ where: { id: ids.page }, data: { ownedById: ids.owner } })
  })
  it('lets a Guest owner read restricted content but rejects content writes', async () => {
    await prisma.page.update({
      where: { id: ids.page },
      data: { ownedById: ids.guest, restricted: true, visibility: 'PRIVATE' },
    })
    expect((await request('guest', `/pages/${prefix}`)).statusCode).toBe(200)
    expect(
      (await request('guest', `/pages/${prefix}`, 'PATCH', { content: 'forbidden' })).statusCode,
    ).toBe(403)
    expect((await request('owner', `/pages/${prefix}`)).statusCode).toBe(404)
    await prisma.page.update({
      where: { id: ids.page },
      data: { ownedById: ids.owner, restricted: false, visibility: 'PUBLIC' },
    })
  })
  it('reserves restriction and ownership changes to their authorized actors', async () => {
    expect(
      (await request('editor', `/pages/${prefix}`, 'PATCH', { restricted: true })).statusCode,
    ).toBe(403)
    expect(
      (await request('owner', `/pages/${prefix}`, 'PATCH', { ownedById: ids.editor })).statusCode,
    ).toBe(403)
    expect(await prisma.revision.count({ where: { pageId: ids.page } })).toBe(0)
    expect(await prisma.activity.count({ where: { pageId: ids.page } })).toBe(0)
  })
  it('hides descendants, comments, favorites and search under a private ancestor', async () => {
    await prisma.comment.create({ data: { userId: ids.editor, pageId: ids.page, body: 'comment' } })
    await prisma.favorite.create({ data: { userId: ids.editor, pageId: ids.page } })
    await prisma.subject.update({ where: { id: ids.subject }, data: { visibility: 'PRIVATE' } })
    expect((await request('editor', `/pages/${prefix}/comments`)).statusCode).toBe(404)
    expect((await request('editor', '/favorites')).json().total).toBe(0)
    expect((await request('editor', '/search?q=Parityneedle')).json().results).toHaveLength(0)
    expect((await request('owner', '/search?q=Parityneedle')).json().results).toHaveLength(1)
    await prisma.subject.update({ where: { id: ids.subject }, data: { visibility: 'PUBLIC' } })
  })
  it('saves exactly one concurrent draft with its snapshot and activity', async () => {
    const responses = await Promise.all([
      request('owner', `/pages/${prefix}`, 'PATCH', { content: 'one', expectedRevision: 0 }),
      request('owner', `/pages/${prefix}`, 'PATCH', { content: 'two', expectedRevision: 0 }),
    ])
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409])
    expect(await prisma.revision.count({ where: { pageId: ids.page } })).toBe(1)
    expect(await prisma.activity.count({ where: { pageId: ids.page, type: 'UPDATED' } })).toBe(1)
    expect((await request('owner', '/users/me/activities')).json().total).toBe(1)
  })
  it('rolls back when activity creation fails', async () => {
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION parity_reject_activity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Activity failure'; END $$`,
    )
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER parity_activity_failure BEFORE INSERT ON activities FOR EACH ROW EXECUTE FUNCTION parity_reject_activity()`,
    )
    try {
      const before = await prisma.page.findUniqueOrThrow({ where: { id: ids.page } })
      expect(
        (
          await request('owner', `/pages/${prefix}`, 'PATCH', {
            content: 'rollback',
            expectedRevision: before.currentRevision,
          })
        ).statusCode,
      ).toBe(500)
      expect(await prisma.page.findUniqueOrThrow({ where: { id: ids.page } })).toMatchObject({
        content: before.content,
        currentRevision: before.currentRevision,
      })
      expect(await prisma.revision.count({ where: { pageId: ids.page } })).toBe(1)
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER parity_activity_failure ON activities')
      await prisma.$executeRawUnsafe('DROP FUNCTION parity_reject_activity()')
    }
  })
  it('logs comments and replies and hides deleted containers without deleting descendants', async () => {
    const comment = await request('editor', '/comments', 'POST', { pageId: ids.page, body: 'root' })
    expect(comment.statusCode).toBe(201)
    expect(
      (
        await request('guest', '/comments', 'POST', {
          pageId: ids.page,
          parentId: comment.json().id,
          body: 'reply',
        })
      ).statusCode,
    ).toBe(201)
    expect(
      await prisma.activity.count({
        where: { pageId: ids.page, type: { in: ['COMMENTED', 'REPLIED'] } },
      }),
    ).toBe(2)
    await prisma.subject.update({ where: { id: ids.subject }, data: { deletedAt: new Date() } })
    expect((await request('admin', `/pages/${prefix}`)).statusCode).toBe(404)
    expect((await request('admin', '/subjects?includeDeleted=true')).json().total).toBe(1)
    expect(await prisma.page.findUnique({ where: { id: ids.page } })).not.toBeNull()
  })
})
