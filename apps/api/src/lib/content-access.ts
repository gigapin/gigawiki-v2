import { AsyncLocalStorage } from 'node:async_hooks'

import type { FastifyRequest } from 'fastify'

import { env } from '../config/env.js'

export type Actor = { id: string; role: string }
export const contentContext = new AsyncLocalStorage<{ request: FastifyRequest }>()
type Filter = Record<string, unknown>
const and = (...filters: Filter[]): Filter => ({ AND: filters })
function visibility(actor: Actor, owner: string): Filter {
  return !env.ENFORCE_CONTENT_ACCESS || actor.role === 'ADMIN'
    ? {}
    : { OR: [{ visibility: 'PUBLIC' }, { [owner]: actor.id }] }
}
export function subjectAccess(actor: Actor, includeDeleted = false): Filter {
  return and(includeDeleted ? {} : { deletedAt: null }, visibility(actor, 'userId'))
}
export function projectAccess(actor: Actor, includeDeleted = false): Filter {
  return and(includeDeleted ? {} : { deletedAt: null }, visibility(actor, 'userId'), {
    subject: { is: subjectAccess(actor, includeDeleted) },
  })
}
export function sectionAccess(actor: Actor): Filter {
  const own =
    !env.ENFORCE_CONTENT_ACCESS || actor.role === 'ADMIN'
      ? {}
      : {
          OR: [{ visibility: 'PUBLIC' }, { project: { is: { userId: actor.id } } }],
        }
  return and({ deletedAt: null }, own, { project: { is: projectAccess(actor) } })
}
export function pageAccess(actor: Actor): Filter {
  const privacy =
    !env.ENFORCE_CONTENT_ACCESS || actor.role === 'ADMIN'
      ? {}
      : and(
          visibility(actor, 'ownedById'),
          { OR: [{ restricted: false }, { ownedById: actor.id }] },
          actor.role === 'GUEST' ? { isDraft: false } : {},
        )
  return and(
    { deletedAt: null },
    privacy,
    { section: { is: sectionAccess(actor) } },
    {
      project: { is: projectAccess(actor) },
    },
  )
}
export function relatedAccess(actor: Actor, subject = false): Filter {
  const targets = [
    ['page', pageAccess(actor)],
    ['project', projectAccess(actor)],
    ['section', sectionAccess(actor)],
    ...(subject ? [['subject', subjectAccess(actor)]] : []),
  ] as [string, Filter][]
  return and(
    { OR: targets.map(([name, filter]) => ({ [name]: { is: filter } })) },
    ...targets.map(([name, filter]) => ({
      OR: [{ [name + 'Id']: null }, { [name]: { is: filter } }],
    })),
  )
}
export function modelAccess(
  model: string,
  actor: Actor,
  includeDeleted = false,
): Filter | undefined {
  switch (model) {
    case 'Subject':
      return subjectAccess(actor, includeDeleted)
    case 'Project':
      return projectAccess(actor, includeDeleted)
    case 'Section':
      return sectionAccess(actor)
    case 'Page':
      return pageAccess(actor)
    case 'Revision':
      return { page: { is: pageAccess(actor) } }
    case 'Comment':
      return relatedAccess(actor)
    case 'Tag':
      return relatedAccess(actor, true)
    case 'Favorite':
      return relatedAccess(actor)
    case 'View':
      return relatedAccess(actor, true)
    case 'Activity':
      return actor.role === 'ADMIN'
        ? undefined
        : { OR: [relatedAccess(actor, true), { resourceType: 'AUTH', userId: actor.id }] }
  }
}
const relations: Record<string, Record<string, string>> = {
  Subject: { projects: 'Project', tags: 'Tag' },
  Project: { sections: 'Section', pages: 'Page', tags: 'Tag', comments: 'Comment' },
  Section: { pages: 'Page', tags: 'Tag', comments: 'Comment' },
  Page: { tags: 'Tag', comments: 'Comment', revisions: 'Revision' },
  Comment: { replies: 'Comment' },
}
// Prisma does not run query extensions on nested relation reads. Filter those too.
export function scopeRelations(model: string, args: Record<string, unknown>, actor: Actor) {
  for (const kind of ['select', 'include']) {
    const selection = args[kind] as Record<string, unknown> | undefined
    if (!selection) continue
    for (const [relation, target] of Object.entries(relations[model] ?? {})) {
      if (!selection[relation]) continue
      const nested =
        selection[relation] === true ? {} : (selection[relation] as Record<string, unknown>)
      selection[relation] = nested
      nested.where = and((nested.where as Filter) ?? {}, modelAccess(target, actor) ?? {})
      scopeRelations(target, nested, actor)
    }
    const count = selection._count as { select?: Record<string, unknown> } | undefined
    for (const [relation, target] of Object.entries(relations[model] ?? {})) {
      if (!count?.select?.[relation]) continue
      const current =
        count.select[relation] === true ? {} : (count.select[relation] as { where?: Filter })
      count.select[relation] = { where: and(current.where ?? {}, modelAccess(target, actor) ?? {}) }
    }
  }
}
