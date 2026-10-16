import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma.js'
import { adminTransaction, apiError } from '../lib/admin-transaction.js'
import { recordActivity } from '../lib/activity.js'

const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
const resources = {
  subject: { select: { id: true, name: true, slug: true } },
  project: { select: { id: true, name: true, slug: true } },
  section: { select: { id: true, title: true, slug: true, project: { select: { slug: true } } } },
  page: { select: { id: true, title: true, slug: true } },
} as const

export async function parityRoutes(app: FastifyInstance) {
  app.get('/projects', async (req) => {
    const { page, limit, scope, search } = pagination
      .extend({
        scope: z.enum(['mine', 'accessible']).default('mine'),
        search: z.string().max(500).optional(),
      })
      .parse(req.query)
    const where = {
      deletedAt: null,
      ...(scope === 'mine' ? { userId: req.user.id } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          subject: { select: { name: true, slug: true } },
          image: { select: { url: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({ where }),
    ])
    return { projects, total, page, limit }
  })

  app.get('/tags/catalog', async (req) => {
    const { page, limit, search } = pagination
      .extend({ search: z.string().max(100).default('') })
      .parse(req.query)
    const tags = await prisma.tag.findMany({
      where: { name: { contains: search.toLowerCase() } },
      select: { name: true, pageId: true, projectId: true, sectionId: true, subjectId: true },
    })
    const groups = new Map<string, Set<string>>()
    for (const tag of tags) {
      const values = groups.get(tag.name) ?? new Set<string>()
      values.add(JSON.stringify([tag.subjectId, tag.projectId, tag.sectionId, tag.pageId]))
      groups.set(tag.name, values)
    }
    const names = [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ name, count: items.size }))
    return { tags: names.slice((page - 1) * limit, page * limit), total: names.length, page, limit }
  })
  app.get<{ Params: { name: string } }>('/tags/catalog/:name', async (req) => {
    const { page, limit } = pagination.parse(req.query)
    const where = { name: req.params.name.toLowerCase() }
    const associations = await prisma.tag.findMany({
      where,
      include: resources,
      orderBy: { id: 'asc' },
    })
    const unique = new Map<string, (typeof associations)[number]>()
    for (const tag of associations) {
      const key = JSON.stringify([tag.subjectId, tag.projectId, tag.sectionId, tag.pageId])
      if (!unique.has(key)) unique.set(key, tag)
    }
    const items = [...unique.values()]
    return { tags: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit }
  })
  app.patch<{ Params: { id: string } }>('/tags/:id', async (req) => {
    const { name } = z
      .object({ name: z.string().trim().min(1).max(50).toLowerCase() })
      .parse(req.body)
    const tag = await prisma.tag.findFirst({ where: { id: req.params.id } })
    if (!tag) throw apiError(404, 'Tag not found')
    if (req.user.role !== 'ADMIN' && tag.userId !== req.user.id) throw apiError(403, 'Forbidden')
    return prisma.tag.update({ where: { id: tag.id }, data: { name } })
  })

  app.get('/admin/trash/pages', async (req) => {
    if (req.user.role !== 'ADMIN') throw apiError(403, 'Admin access required')
    const { page, limit } = pagination.parse(req.query)
    const where = { deletedAt: { not: null } }
    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          deletedAt: true,
          section: {
            select: {
              title: true,
              deletedAt: true,
              project: {
                select: { name: true, deletedAt: true, subject: { select: { deletedAt: true } } },
              },
            },
          },
        },
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.page.count({ where }),
    ])
    return { pages, total, page, limit }
  })
  app.post<{ Params: { id: string } }>('/admin/trash/pages/:id/restore', async (req) => {
    if (req.user.role !== 'ADMIN') throw apiError(403, 'Admin access required')
    return adminTransaction(async (tx) => {
      const page = await tx.page.findFirst({
        where: { id: req.params.id, deletedAt: { not: null } },
        include: {
          section: { include: { project: { include: { subject: true } } } },
          project: true,
        },
      })
      if (!page) throw apiError(404, 'Deleted page not found')
      if (
        page.section.deletedAt ||
        page.project.deletedAt ||
        page.section.project.deletedAt ||
        page.section.project.subject.deletedAt
      )
        throw apiError(409, 'Restore the deleted ancestors first')
      const restored = await tx.page.update({
        where: { id: page.id, deletedAt: page.deletedAt },
        data: { deletedAt: null },
      })
      await recordActivity(tx, req, 'PAGE', page.id, 'RESTORED', 'Restored deleted page')
      return { id: restored.id, slug: restored.slug, title: restored.title }
    })
  })

  app.get<{ Params: { slug: string } }>('/pages/:slug/navigation', async (req) => {
    const page = await prisma.page.findFirst({
      where: { slug: req.params.slug },
      select: { id: true, projectId: true },
    })
    if (!page) throw apiError(404, 'Page not found')
    const pages = await prisma.page.findMany({
      where: { projectId: page.projectId },
      select: { id: true, title: true, slug: true },
      orderBy: [
        { section: { position: 'asc' } },
        { section: { id: 'asc' } },
        { position: 'asc' },
        { id: 'asc' },
      ],
    })
    const index = pages.findIndex((item) => item.id === page.id)
    return { previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null }
  })

  app.get('/users/me/contributions', async (req) => {
    const { page, limit } = pagination.parse(req.query)
    const where = { updatedById: req.user.id, deletedAt: null }
    const [subjects, projects, pagesCreated, pagesLastEdited, pages] = await Promise.all([
      prisma.subject.count({ where: { userId: req.user.id, deletedAt: null } }),
      prisma.project.count({ where: { userId: req.user.id, deletedAt: null } }),
      prisma.page.count({ where: { createdById: req.user.id, deletedAt: null } }),
      prisma.page.count({ where }),
      prisma.page.findMany({
        where,
        select: { id: true, title: true, slug: true, updatedAt: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return {
      subjects,
      projects,
      pagesCreated,
      pagesLastEdited,
      pages,
      total: pagesLastEdited,
      page,
      limit,
    }
  })
}
