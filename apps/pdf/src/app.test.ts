import { expect, it, vi } from 'vitest'

import { buildRenderer } from './app.js'

const secret = 'renderer-test-secret-32-characters'
function fixture(pdf = async () => new Uint8Array(Buffer.from('%PDF-1.7'))) {
  const page = {
    setDefaultTimeout: vi.fn(),
    setJavaScriptEnabled: vi.fn(),
    setRequestInterception: vi.fn(),
    on: vi.fn(),
    setContent: vi.fn(),
    pdf: vi.fn(pdf),
  }
  const context = { newPage: vi.fn(async () => page), close: vi.fn(async () => {}) }
  const browser = {
    connected: true,
    createBrowserContext: vi.fn(async () => context),
    close: vi.fn(async () => {}),
  }
  const launch = vi.fn(async () => browser as never)
  return { app: buildRenderer(secret, launch), page, context, browser, launch }
}
it('requires the internal secret before launching a browser', async () => {
  const { app, launch } = fixture()
  expect(
    (await app.inject({ method: 'POST', url: '/render', payload: { html: '<p>x</p>' } }))
      .statusCode,
  ).toBe(401)
  expect(launch).not.toHaveBeenCalled()
  await app.close()
})
it('disables document scripts, blocks network requests and disposes the context', async () => {
  const { app, page, context } = fixture()
  const response = await app.inject({
    method: 'POST',
    url: '/render',
    headers: { authorization: `Bearer ${secret}` },
    payload: { html: '<p>safe</p>' },
  })
  expect(response.statusCode).toBe(200)
  expect(page.setJavaScriptEnabled).toHaveBeenCalledWith(false)
  const handler = page.on.mock.calls[0][1] as (value: unknown) => void
  const blocked = { url: () => 'http://127.0.0.1/internal', continue: vi.fn(), abort: vi.fn() }
  handler(blocked)
  expect(blocked.abort).toHaveBeenCalled()
  expect(blocked.continue).not.toHaveBeenCalled()
  const embedded = { url: () => 'data:image/webp;base64,AA', continue: vi.fn(), abort: vi.fn() }
  handler(embedded)
  expect(embedded.continue).toHaveBeenCalled()
  expect(context.close).toHaveBeenCalledTimes(1)
  await app.close()
})
it('limits concurrent rendering and releases contexts after failure', async () => {
  let release: (value: Uint8Array) => void = () => {}
  const pending = new Promise<Uint8Array>((resolve) => {
    release = resolve
  })
  const { app, page, context } = fixture(() => pending)
  const input = {
    method: 'POST' as const,
    url: '/render',
    headers: { authorization: `Bearer ${secret}` },
    payload: { html: '<p>x</p>' },
  }
  const first = app.inject(input).then((result) => result)
  const second = app.inject(input).then((result) => result)
  await vi.waitFor(() => expect(page.pdf).toHaveBeenCalledTimes(2))
  expect((await app.inject(input)).statusCode).toBe(429)
  release(new Uint8Array(Buffer.from('%PDF-')))
  await Promise.all([first, second])
  expect(context.close).toHaveBeenCalledTimes(2)
  page.pdf.mockRejectedValueOnce(new Error('timeout'))
  expect((await app.inject(input)).statusCode).toBe(500)
  expect(context.close).toHaveBeenCalledTimes(3)
  await app.close()
})
