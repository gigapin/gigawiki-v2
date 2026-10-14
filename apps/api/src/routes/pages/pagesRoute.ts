import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { generateUniqueSlug } from '../../lib/slugify.js'
import { prisma } from '../../lib/prisma.js'
import { auditedWrite } from '../../lib/activity.js'
import { savePage } from '../../lib/page-save.js'
import { env } from '../../config/env.js'

const pageFields = {
  title: z.string().trim().min(1).max(190),
  content: z.string(),
  isDraft: z.boolean(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
}
const createPageSchema = z.object({
  ...pageFields,
  content: pageFields.content.default(''),
  sectionId: z.string().min(1),
  isDraft: pageFields.isDraft.default(false),
  visibility: pageFields.visibility.optional(),
  restricted: z.boolean().optional(),
})
const PAGE_INDEX_SELECT = {
  id: true,
  title: true,
  slug: true,
  position: true,
  visibility: true,
  isDraft: true,
  restricted: true,
  currentRevision: true,
  sectionId: true,
  projectId: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, slug: true } },
}

type PageSlugParams = { slug: string }
type SectionPagesParams = { sectionSlug: string }
type PagesQuery = { isDraft?: string; visibility?: string; page?: string; limit?: string }
type SearchQuery = { q: string; page?: string; limit?: string }

type CreatePageBody = {
  title: string
  content: string
  sectionId: string
  isDraft?: boolean
  visibility?: 'PUBLIC' | 'PRIVATE'
}

type PutPageBody = {
  title: string
  content: string
}

type PatchPageBody = {
  title?: string
  content?: string
  isDraft?: boolean
  visibility?: 'PUBLIC' | 'PRIVATE'
  restricted?: boolean
  ownedById?: string
}

export async function fetchPagesBySection(fastify: FastifyInstance) {
  fastify.get<{ Params: SectionPagesParams; Querystring: PagesQuery }>(
    '/sections/:sectionSlug/pages',
    async (req, reply) => {
      const { sectionSlug } = req.params
      const { isDraft, visibility, page = '1', limit = '20' } = req.query

      const section = await prisma.section.findFirst({
        where: { slug: sectionSlug, deletedAt: null },
        select: { id: true },
      })

      if (!section) {
        return reply.status(404).send({ error: 'Section not found' })
      }

      const skip = (parseInt(page) - 1) * parseInt(limit)
      const take = parseInt(limit)

      const where = {
        sectionId: section.id,
        deletedAt: null,
        ...(isDraft !== undefined ? { isDraft: isDraft === 'true' } : {}),
        ...(visibility ? { visibility: visibility as 'PUBLIC' | 'PRIVATE' } : {}),
      }

      const [pages, total] = await Promise.all([
        prisma.page.findMany({
          where,
          select: PAGE_INDEX_SELECT,
          orderBy: { position: 'asc' },
          skip,
          take,
        }),
        prisma.page.count({ where }),
      ])

      if (req.user?.id) {
        await prisma.view
          .upsert({
            where: { userId_sectionId: { userId: req.user.id, sectionId: section.id } },
            update: { count: { increment: 1 }, lastSeenAt: new Date() },
            create: { userId: req.user.id, sectionId: section.id },
          })
          .catch(() => {})
      }

      return reply.status(200).send({ pages, total, page: parseInt(page), limit: take })
    },
  )
}

export async function fetchPage(fastify: FastifyInstance) {
  fastify.get<{ Params: PageSlugParams }>('/pages/:slug', async (req, reply) => {
    const { slug } = req.params

    const page = await prisma.page.findFirst({
      where: { slug, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true, slug: true } },
        updatedBy: { select: { id: true, name: true, slug: true } },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            subject: { select: { name: true, slug: true } },
          },
        },
        section: { select: { id: true, title: true, slug: true } },
        tags: true,
        favorites: { where: { userId: req.user?.id ?? '' }, select: { id: true } },
        _count: {
          select: { comments: true, favorites: { where: { userId: req.user?.id ?? '' } } },
        },
      },
    })

    if (!page) {
      return reply.status(404).send({ error: 'Page not found' })
    }

    try {
      await req.jwtVerify()
      await prisma.view
        .upsert({
          where: { userId_pageId: { userId: req.user.id, pageId: page.id } },
          update: { count: { increment: 1 }, lastSeenAt: new Date() },
          create: { userId: req.user.id, pageId: page.id },
        })
        .catch(() => {})
    } catch {
      // unauthenticated — skip view tracking
    }

    const { favorites, ...detail } = page
    return reply.status(200).send({ ...detail, favorited: Boolean(favorites?.length) })
  })
}

export async function createPage(fastify: FastifyInstance) {
  fastify.post<{ Body: CreatePageBody }>('/pages', async (req, reply) => {
    if (req.user.role === 'GUEST') {
      return reply.status(403).send({ error: 'Editor or Admin role required' })
    }

    const parsed = createPageSchema.safeParse(req.body)
    if (!parsed.success)
      return reply.status(400).send({
        error: 'Invalid page: a title of 1–190 characters and a valid section are required',
      })
    const { title, content, sectionId, isDraft, visibility, restricted } = parsed.data

    const section = await prisma.section.findFirst({
      where: { id: sectionId, deletedAt: null },
      select: { projectId: true },
    })

    if (!section) {
      return reply.status(404).send({ error: 'Section not found' })
    }

    const slug = await generateUniqueSlug(title, async (candidate) =>
      Boolean(await prisma.page.findUnique({ where: { slug: candidate }, select: { id: true } })),
    )

    const aggregate = await prisma.page.aggregate({
      where: { sectionId },
      _max: { position: true },
    })
    const position = (aggregate._max.position ?? -1) + 1

    const page = await auditedWrite(req, 'PAGE', 'CREATED', (tx) =>
      tx.page.create({
        data: {
          title,
          content,
          sectionId,
          projectId: section.projectId,
          slug,
          position,
          isDraft,
          visibility,
          ...(restricted !== undefined ? { restricted } : {}),
          currentRevision: 0,
          createdById: req.user.id,
          updatedById: req.user.id,
          ownedById: req.user.id,
          publishedAt: isDraft ? null : new Date(),
        },
        select: PAGE_INDEX_SELECT,
      }),
    )

    return reply.status(201).send(page)
  })
}

export async function replacePage(fastify: FastifyInstance) {
  fastify.put<{ Params: PageSlugParams; Body: PutPageBody }>('/pages/:slug', async (req, reply) =>
    reply.send(await savePage(req, req.params.slug, true)),
  )
}
export async function updatePage(fastify: FastifyInstance) {
  fastify.patch<{ Params: PageSlugParams; Body: PatchPageBody }>(
    '/pages/:slug',
    async (req, reply) => reply.send(await savePage(req, req.params.slug)),
  )
}

export async function deletePage(fastify: FastifyInstance) {
  fastify.delete<{ Params: PageSlugParams }>('/pages/:slug', async (req, reply) => {
    if (req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const existing = await prisma.page.findFirst({
      where: { slug: req.params.slug, deletedAt: null },
      select: { id: true },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Page not found' })
    }

    await auditedWrite(req, 'PAGE', 'DELETED', (tx) =>
      tx.page.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      }),
    )

    return reply.status(200).send({ message: 'Page deleted successfully' })
  })
}

export async function searchPages(fastify: FastifyInstance) {
  fastify.get<{ Querystring: SearchQuery }>('/search', async (req, reply) => {
    const { q, page = '1', limit = '20' } = req.query

    if (!q || q.trim().length < 2) {
      return reply.status(400).send({ error: 'Query must be at least 2 characters' })
    }

    const take = parseInt(limit)
    const skip = (parseInt(page) - 1) * take

    const results = await prisma.$queryRaw<
      Array<{
        id: string
        title: string
        slug: string
        sectionId: string
        projectId: string
        rank: number
      }>
    >(Prisma.sql`
      SELECT p.id, p.title, p.slug, p."sectionId", p."projectId", pr.name AS "projectName", pr.slug AS "projectSlug",
             ts_rank(search_vector, plainto_tsquery('english', ${q})) AS rank
      FROM pages p
      JOIN sections se ON se.id = p."sectionId"
      JOIN projects pr ON pr.id = p."projectId"
      JOIN subjects su ON su.id = pr."subjectId"
      WHERE search_vector @@ plainto_tsquery('english', ${q})
        AND p."deletedAt" IS NULL AND se."deletedAt" IS NULL AND pr."deletedAt" IS NULL AND su."deletedAt" IS NULL
        AND (${!env.ENFORCE_CONTENT_ACCESS} OR ${req.user.role === 'ADMIN'} OR (
          (p.visibility = 'PUBLIC' OR p."ownedById" = ${req.user.id})
          AND (NOT p.restricted OR p."ownedById" = ${req.user.id})
          AND (${req.user.role !== 'GUEST'} OR NOT p."isDraft")
          AND (se.visibility = 'PUBLIC' OR pr."userId" = ${req.user.id})
          AND (pr.visibility = 'PUBLIC' OR pr."userId" = ${req.user.id})
          AND (su.visibility = 'PUBLIC' OR su."userId" = ${req.user.id})
        ))
      ORDER BY rank DESC
      LIMIT ${take} OFFSET ${skip}
    `)

    return reply.status(200).send({ results, page: parseInt(page), limit: take })
  })
}
