import { buildRenderer } from './app.js'

const app = buildRenderer(process.env.PDF_RENDERER_SECRET ?? '')
await app.listen({ host: '0.0.0.0', port: 3002 })
