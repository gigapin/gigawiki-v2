import Fastify from 'fastify'
import puppeteer, { type Browser, type BrowserContext } from 'puppeteer'

export function buildRenderer(
  secret: string,
  launch = () => puppeteer.launch({ headless: true, timeout: 20000 }),
) {
  if (secret.length < 32) throw new Error('PDF_RENDERER_SECRET must contain at least 32 characters')
  const app = Fastify({ bodyLimit: 30 * 1024 * 1024 })
  let active = 0
  let browser: Promise<Browser> | undefined
  app.get('/health', () => ({ status: 'ok' }))
  app.post('/render', async (req, reply) => {
    if (req.headers.authorization !== `Bearer ${secret}`)
      return reply.code(401).send({ error: 'Unauthorized' })
    const html = (req.body as { html?: unknown })?.html
    if (typeof html !== 'string' || html.length === 0)
      return reply.code(400).send({ error: 'HTML required' })
    if (active >= 2) return reply.code(429).send({ error: 'Renderer busy' })
    active++
    let context: BrowserContext | undefined
    let expired = false
    const deadline = setTimeout(() => {
      expired = true
      void context?.close().catch(() => {})
    }, 30000)
    try {
      browser ??= launch().catch((error) => {
        browser = undefined
        throw error
      })
      const instance = await browser
      if (expired) throw new Error('PDF deadline exceeded')
      if (!instance.connected) {
        browser = undefined
        throw new Error('Renderer disconnected')
      }
      context = await instance.createBrowserContext()
      if (expired) throw new Error('PDF deadline exceeded')
      const page = await context.newPage()
      page.setDefaultTimeout(25000)
      await page.setJavaScriptEnabled(false)
      await page.setRequestInterception(true)
      page.on('request', (request) => {
        void (request.url().startsWith('data:') ? request.continue() : request.abort())
      })
      await page.setContent(html, { waitUntil: 'load', timeout: 25000 })
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        timeout: 25000,
        margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' },
      })
      return reply.type('application/pdf').send(Buffer.from(pdf))
    } finally {
      clearTimeout(deadline)
      await context?.close().catch(() => {})
      active--
    }
  })
  app.addHook('onClose', async () => {
    if (browser) await (await browser).close()
  })
  return app
}
