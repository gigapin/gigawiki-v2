import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { generateSlug, generateUniqueSlug } from '../../lib/slugify.js'
import { prisma } from '../../lib/prisma.js'

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
})
const updatePageSchema = z
  .object({
    ...pageFields,
    restricted: z.boolean(),
    ownedById: z.string().min(1),
  })
  .partial()

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
    const { title, content, sectionId, isDraft, visibility } = parsed.data

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

    const page = await prisma.page.create({
      data: {
        title,
        content,
        sectionId,
        projectId: section.projectId,
        slug,
        position,
        isDraft,
        visibility,
        currentRevision: 0,
        createdById: req.user.id,
        updatedById: req.user.id,
        ownedById: req.user.id,
        publishedAt: isDraft ? null : new Date(),
      },
      select: PAGE_INDEX_SELECT,
    })

    return reply.status(201).send(page)
  })
}

export async function replacePage(fastify: FastifyInstance) {
  fastify.put<{ Params: PageSlugParams; Body: PutPageBody }>('/pages/:slug', async (req, reply) => {
    if (req.user.role === 'GUEST') {
      return reply.status(403).send({ error: 'Editor or Admin role required' })
    }

    const { slug } = req.params
    const { title, content } = req.body

    const existing = await prisma.page.findFirst({
      where: { slug, deletedAt: null },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Page not found' })
    }

    await prisma.revision.create({
      data: {
        pageId: existing.id,
        projectId: existing.projectId,
        sectionId: existing.sectionId,
        createdById: req.user.id,
        title: existing.title,
        content: existing.content,
        slug: existing.slug,
        revisionNumber: existing.currentRevision,
      },
    })

    const newSlug = title !== existing.title ? generateSlug(title) : existing.slug

    const page = await prisma.page.update({
      where: { id: existing.id },
      data: {
        title,
        content,
        slug: newSlug,
        updatedById: req.user.id,
        currentRevision: existing.currentRevision + 1,
      },
      select: PAGE_INDEX_SELECT,
    })

    return reply.status(200).send(page)
  })
}

export async function updatePage(fastify: FastifyInstance) {
  fastify.patch<{ Params: PageSlugParams; Body: PatchPageBody }>(
    '/pages/:slug',
    async (req, reply) => {
      if (req.user.role === 'GUEST') {
        return reply.status(403).send({ error: 'Editor or Admin role required' })
      }

      const { slug } = req.params
      const parsed = updatePageSchema.safeParse(req.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid page fields' })
      const { title, content, isDraft, visibility, restricted, ownedById } = parsed.data

      const existing = await prisma.page.findFirst({
        where: { slug, deletedAt: null },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Page not found' })
      }

      const contentChanged = content !== undefined && content !== existing.content
      const titleChanged = title !== undefined && title !== existing.title

      if (contentChanged || titleChanged) {
        await prisma.revision.create({
          data: {
            pageId: existing.id,
            projectId: existing.projectId,
            sectionId: existing.sectionId,
            createdById: req.user.id,
            title: existing.title,
            content: existing.content,
            slug: existing.slug,
            revisionNumber: existing.currentRevision,
          },
        })
      }

      const data: Record<string, unknown> = { updatedById: req.user.id }

      if (title !== undefined) {
        data.title = title
        if (titleChanged)
          data.slug = await generateUniqueSlug(title, async (candidate) => {
            const match = await prisma.page.findUnique({
              where: { slug: candidate },
              select: { id: true },
            })
            return Boolean(match && match.id !== existing.id)
          })
      }
      if (content !== undefined) data.content = content
      if (isDraft !== undefined) {
        data.isDraft = isDraft
        if (!isDraft && existing.isDraft) data.publishedAt = new Date()
      }
      if (visibility !== undefined) data.visibility = visibility
      if (restricted !== undefined) data.restricted = restricted
      if (ownedById !== undefined) data.ownedById = ownedById
      if (contentChanged || titleChanged) data.currentRevision = existing.currentRevision + 1

      const page = await prisma.page.update({
        where: { id: existing.id },
        data,
        select: PAGE_INDEX_SELECT,
      })

      return reply.status(200).send(page)
    },
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

    await prisma.page.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

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
      SELECT id, title, slug, "sectionId", "projectId",
             ts_rank(search_vector, plainto_tsquery('english', ${q})) AS rank
      FROM pages
      WHERE search_vector @@ plainto_tsquery('english', ${q})
        AND "deletedAt" IS NULL
        AND visibility = 'PUBLIC'
      ORDER BY rank DESC
      LIMIT ${Prisma.raw(String(take))} OFFSET ${Prisma.raw(String(skip))}
    `)

    return reply.status(200).send({ results, page: parseInt(page), limit: take })
  })
}
