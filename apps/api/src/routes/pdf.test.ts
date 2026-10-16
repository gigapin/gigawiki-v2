import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Fastify from 'fastify'

import { prisma } from '../lib/prisma.js'
import { readFile } from '../lib/storage.js'

import { pdfRoutes } from './pdf.js'

vi.mock('../config/env.js', () => ({
  env: { PDF_RENDERER_URL: 'http://renderer:3002', PDF_RENDERER_SECRET: 'a'.repeat(32) },
}))
vi.mock('../lib/prisma.js', () => ({
  prisma: { page: { findFirst: vi.fn() }, image: { findFirst: vi.fn() } },
}))
vi.mock('../lib/storage.js', () => ({ readFile: vi.fn() }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.page.findFirst).mockResolvedValue({
    title: 'à/notes',
    content: '<p>Hi<script>alert(1)</script></p>',
  } as never)
})
afterEach(() => vi.unstubAllGlobals())
it('exports escaped, sanitized saved content with private headers and a Unicode filename', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response('%PDF-1.7\nfixture', { headers: { 'content-type': 'application/pdf' } }),
    )
  vi.stubGlobal('fetch', fetch)
  const app = Fastify()
  await app.register(pdfRoutes)
  const response = await app.inject('/pages/wiki/export/pdf')
  expect(response.statusCode).toBe(200)
  expect(response.headers['content-type']).toBe('application/pdf')
  expect(response.headers['cache-control']).toBe('private, no-store')
  expect(response.headers['content-disposition']).toContain('%C3%A0_notes.pdf')
  const request = JSON.parse(fetch.mock.calls[0][1].body)
  expect(request.html).not.toContain('<script>')
  expect(request.html).toContain("default-src 'none'")
  await app.close()
})
it('refuses unregistered image URLs without fetching them', async () => {
  vi.mocked(prisma.page.findFirst).mockResolvedValue({
    title: 'x',
    content: '<p><img src="http://127.0.0.1/private"></p>',
  } as never)
  vi.mocked(prisma.image.findFirst).mockResolvedValue(null)
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const app = Fastify()
  await app.register(pdfRoutes)
  expect((await app.inject('/pages/wiki/export/pdf')).statusCode).toBe(422)
  expect(fetch).not.toHaveBeenCalled()
  expect(readFile).not.toHaveBeenCalled()
  await app.close()
})
it('embeds only registered storage assets and surfaces renderer saturation', async () => {
  vi.mocked(prisma.page.findFirst).mockResolvedValue({
    title: 'x',
    content: '<img src="https://wiki/uploads/picture">',
  } as never)
  vi.mocked(prisma.image.findFirst).mockResolvedValue({
    path: 'uploads/picture',
    storageDriver: 'local',
  } as never)
  vi.mocked(readFile).mockResolvedValue({
    Body: (async function* () {
      yield Buffer.from('image')
    })(),
  } as never)
  const fetch = vi.fn().mockResolvedValue(new Response('', { status: 429 }))
  vi.stubGlobal('fetch', fetch)
  const app = Fastify()
  await app.register(pdfRoutes)
  expect((await app.inject('/pages/wiki/export/pdf')).statusCode).toBe(429)
  expect(readFile).toHaveBeenCalledWith('uploads/picture', 'local')
  expect(JSON.parse(fetch.mock.calls[0][1].body).html).toContain('data:image/webp;base64,')
  await app.close()
})
it('does not call the renderer for inaccessible pages or unsupported JSON', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const app = Fastify()
  await app.register(pdfRoutes)
  vi.mocked(prisma.page.findFirst).mockResolvedValueOnce(null)
  expect((await app.inject('/pages/wiki/export/pdf')).statusCode).toBe(404)
  vi.mocked(prisma.page.findFirst).mockResolvedValueOnce({
    title: 'x',
    content: JSON.stringify({ type: 'doc', content: [{ type: 'unknown' }] }),
  } as never)
  expect((await app.inject('/pages/wiki/export/pdf')).statusCode).toBe(422)
  expect(fetch).not.toHaveBeenCalled()
  await app.close()
})
