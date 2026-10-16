import { expect, it, vi } from 'vitest'

import { auditImages } from './image-audit.js'
import { prisma } from './prisma.js'
import { storageExists } from './storage.js'

vi.mock('../config/env.js', () => ({ env: { STORAGE_DRIVER: 'local' } }))
vi.mock('./storage.js', () => ({
  storageExists: vi.fn(),
  storageFiles: async function* () {
    yield 'uploads/known'
    yield 'uploads/unknown'
  },
}))
vi.mock('./prisma.js', () => ({
  prisma: {
    image: { findMany: vi.fn() },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    setting: { findMany: vi.fn().mockResolvedValue([]) },
    subject: { findMany: vi.fn().mockResolvedValue([]) },
    project: { findMany: vi.fn().mockResolvedValue([]) },
    section: { findMany: vi.fn().mockResolvedValue([]) },
    page: { findMany: vi.fn().mockResolvedValue([]) },
    revision: { findMany: vi.fn() },
  },
}))
it('preserves references found only in history and distinguishes missing/unregistered assets', async () => {
  vi.mocked(prisma.image.findMany).mockResolvedValue([
    {
      id: 'history',
      url: 'https://wiki/history.webp',
      path: 'uploads/known',
      storageDriver: 'local',
    },
    {
      id: 'missing',
      url: 'https://wiki/missing.webp',
      path: 'uploads/missing',
      storageDriver: 'local',
    },
    {
      id: 'candidate',
      url: 'https://wiki/candidate.webp',
      path: 'uploads/candidate',
      storageDriver: 'local',
    },
  ] as never)
  vi.mocked(prisma.revision.findMany).mockResolvedValue([
    { id: 'revision', content: '<p><img src="https://wiki/history.webp"></p>' },
  ] as never)
  vi.mocked(storageExists).mockImplementation(async (path) => path !== 'uploads/missing')
  const result = await auditImages()
  expect(result.rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'history', references: 1, status: 'referenced' }),
      expect.objectContaining({ id: 'missing', status: 'missing' }),
      expect.objectContaining({ id: 'candidate', status: 'candidate' }),
      expect.objectContaining({ id: null, path: 'uploads/unknown', status: 'unregistered' }),
    ]),
  )
  expect(result.warnings).toEqual([])
  expect(Object.keys(prisma.image)).toEqual(['findMany'])
})
it('reports storage errors as unavailable, not as proof of missing files', async () => {
  vi.mocked(storageExists).mockRejectedValue(new Error('Denied'))
  const result = await auditImages()
  expect(result.rows.filter((row) => row.id).every((row) => row.status === 'unavailable')).toBe(
    true,
  )
  expect(result.warnings.length).toBeGreaterThan(0)
})
