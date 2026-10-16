import { env } from '../config/env.js'

import { prisma } from './prisma.js'
import { storageExists, storageFiles, type StorageDriver } from './storage.js'

export type ImageAuditRow = {
  id: string | null
  path: string
  driver: string
  references: number
  status: 'referenced' | 'candidate' | 'missing' | 'unregistered' | 'unavailable'
}
export async function auditImages() {
  const images = await prisma.image.findMany()
  const counts = new Map(images.map((image) => [image.id, 0]))
  const reference = (id: string | null) => {
    if (id && counts.has(id)) counts.set(id, counts.get(id)! + 1)
  }
  const scan = (content: string | null) => {
    const text = (content ?? '').replaceAll('&amp;', '&').replaceAll('\\/', '/')
    for (const image of images) if (text.includes(image.url)) reference(image.id)
  }
  for (const user of await prisma.user.findMany({ select: { avatarId: true } }))
    reference(user.avatarId)
  for (const setting of await prisma.setting.findMany({ where: { key: 'SITE_LOGO_IMAGE_ID' } }))
    reference(setting.value)
  for (const model of ['subject', 'project', 'section', 'page', 'revision'] as const) {
    let cursor: string | undefined
    while (true) {
      const args = {
        take: 200,
        orderBy: { id: 'asc' as const },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }
      const rows: {
        id: string
        description?: string | null
        content?: string
        imageId?: string | null
      }[] =
        model === 'subject'
          ? await prisma.subject.findMany(args)
          : model === 'project'
            ? await prisma.project.findMany(args)
            : model === 'section'
              ? await prisma.section.findMany(args)
              : model === 'page'
                ? await prisma.page.findMany(args)
                : await prisma.revision.findMany(args)
      for (const row of rows) {
        reference(row.imageId ?? null)
        scan(row.description ?? row.content ?? null)
      }
      if (rows.length < 200) break
      cursor = rows.at(-1)!.id
    }
  }
  const rows: ImageAuditRow[] = []
  const warnings: string[] = []
  for (const image of images) {
    let exists: boolean | null = null
    try {
      exists = await storageExists(image.path, image.storageDriver as StorageDriver)
    } catch {
      warnings.push(`Unable to inspect registered asset ${image.id}`)
    }
    const references = counts.get(image.id) ?? 0
    rows.push({
      id: image.id,
      path: image.path,
      driver: image.storageDriver,
      references,
      status:
        exists === null
          ? 'unavailable'
          : !exists
            ? 'missing'
            : references
              ? 'referenced'
              : 'candidate',
    })
  }
  const drivers = new Set<StorageDriver>([
    env.STORAGE_DRIVER,
    ...images.map((image) => image.storageDriver as StorageDriver),
  ])
  for (const driver of drivers) {
    const registered = new Set(
      images.filter((image) => image.storageDriver === driver).map((image) => image.path),
    )
    try {
      for await (const file of storageFiles(driver))
        if (!registered.has(file))
          rows.push({ id: null, path: file, driver, references: 0, status: 'unregistered' })
    } catch {
      warnings.push(`Unable to list ${driver} managed uploads`)
    }
  }
  return {
    createdAt: new Date().toISOString(),
    rows,
    warnings,
    note: 'Read-only audit of managed uploads. Candidates may have external consumers; no files were changed.',
  }
}
