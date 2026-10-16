import type { FastifyInstance } from 'fastify'
import { wikiHTML } from 'wiki-content/server'

import { prisma } from '../lib/prisma.js'
import { readFile } from '../lib/storage.js'
import { env } from '../config/env.js'
import { apiError } from '../lib/admin-transaction.js'

async function bytes(body: unknown) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    size += chunk.length
    if (size > 10 * 1024 * 1024) throw apiError(413, 'Image is too large for PDF export')
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function pdfRoutes(app: FastifyInstance) {
  app.get<{ Params: { slug: string } }>(
    '/pages/:slug/export/pdf',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const page = await prisma.page.findFirst({
        where: { slug: req.params.slug },
        select: { title: true, content: true },
      })
      if (!page) throw apiError(404, 'Page not found')
      if (env.PDF_RENDERER_SECRET.length < 32) throw apiError(503, 'PDF renderer is not configured')
      let content: string
      try {
        content = wikiHTML(page.content)
      } catch {
        throw apiError(422, 'Unsupported content format')
      }
      const sources = [
        ...new Set([...content.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/gi)].map((match) => match[1])),
      ]
      let assetBytes = 0
      for (const source of sources) {
        const image = await prisma.image.findFirst({
          where: { url: source.replaceAll('&amp;', '&') },
        })
        if (!image) throw apiError(422, 'An image is not registered for PDF export')
        let buffer: Buffer
        try {
          buffer = await bytes(
            (await readFile(image.path, image.storageDriver as 'local' | 's3')).Body,
          )
        } catch {
          throw apiError(422, 'An image is unavailable for PDF export')
        }
        assetBytes += buffer.length
        if (assetBytes > 20 * 1024 * 1024) throw apiError(413, 'PDF assets exceed the size limit')
        content = content.replaceAll(
          `src="${source}"`,
          `src="data:image/webp;base64,${buffer.toString('base64')}"`,
        )
      }
      const title = page.title
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'"><style>body{font:12pt sans-serif;color:#111;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:4px}pre{white-space:pre-wrap;background:#f4f4f4;padding:8px}h1,h2,h3,h4{break-after:avoid}tr,img{break-inside:avoid}</style></head><body><h1>${title}</h1>${content}</body></html>`
      if (Buffer.byteLength(html) > 29 * 1024 * 1024)
        throw apiError(413, 'PDF content exceeds the size limit')
      let response: Response
      try {
        response = await fetch(`${env.PDF_RENDERER_URL}/render`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${env.PDF_RENDERER_SECRET}`,
          },
          body: JSON.stringify({ html }),
          signal: AbortSignal.timeout(30000),
        })
      } catch {
        throw apiError(503, 'PDF renderer unavailable or timed out')
      }
      if (!response.ok)
        throw apiError(response.status === 429 ? 429 : 503, 'PDF renderer unavailable or busy')
      const buffer = Buffer.from(await response.arrayBuffer())
      if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-')))
        throw apiError(503, 'Invalid PDF renderer response')
      const filename = page.title.replace(/[\x00-\x1f\x7f/\\";]/g, '_').slice(0, 120) || 'page'
      return reply
        .header('Cache-Control', 'private, no-store')
        .header(
          'Content-Disposition',
          `attachment; filename="page.pdf"; filename*=UTF-8''${encodeURIComponent(filename + '.pdf')}`,
        )
        .type('application/pdf')
        .send(buffer)
    },
  )
}
