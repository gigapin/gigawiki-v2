import { Readable } from 'node:stream'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'

import { prisma } from '../../lib/prisma.js'
import { readFile } from '../../lib/storage.js'

import { uploadImage, deleteImage, serveUploadedImage } from './imagesRoute.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    image: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed')),
  })),
}))

vi.mock('../../lib/storage.js', () => ({
  uploadFile: vi.fn().mockResolvedValue(undefined),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
}))

vi.mock('../../config/env.js', () => ({
  env: {
    API_URL: 'http://localhost:3001',
    AWS_BUCKET: 'gigawiki',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'test',
    AWS_SECRET_ACCESS_KEY: 'test',
  },
}))

const mockImage = vi.mocked(prisma.image)

function buildAuthApp(role: string = 'ADMIN', userId: string = 'user-1') {
  const app = Fastify()
  app.register(multipart)
  app.decorateRequest('user', null as unknown as { id: string; email: string; role: string })
  app.addHook('preHandler', (req, _reply, done) => {
    req.user = { id: userId, email: 'test@example.com', role }
    done()
  })
  app.register(uploadImage)
  app.register(deleteImage)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeImage = {
  id: 'img-1',
  name: 'photo.jpg',
  url: 'http://localhost:3001/uploads/img-1.webp',
  path: 'uploads/user-1/2024/01/abc1234567.webp',
  type: 'INLINE',
  createdById: 'user-1',
  updatedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /uploads/*', () => {
  it('streams only an image path recorded in the database', async () => {
    mockImage.findFirst.mockResolvedValue({ path: fakeImage.path } as never)
    vi.mocked(readFile).mockResolvedValue({
      Body: Readable.from(Buffer.from('image-bytes')),
    } as never)
    const app = Fastify()
    app.register(serveUploadedImage)
    const res = await app.inject({ method: 'GET', url: `/uploads/${fakeImage.path}` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('image/webp')
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin')
    expect(res.body).toBe('image-bytes')
    expect(readFile).toHaveBeenCalledWith(fakeImage.path)
    await app.close()
  })

  it('does not read storage for an unknown path', async () => {
    mockImage.findFirst.mockResolvedValue(null)
    const app = Fastify()
    app.register(serveUploadedImage)
    const res = await app.inject({ method: 'GET', url: '/uploads/unknown.webp' })
    expect(res.statusCode).toBe(404)
    expect(readFile).not.toHaveBeenCalled()
    await app.close()
  })

  it('returns 404 when the object no longer exists', async () => {
    mockImage.findFirst.mockResolvedValue({ path: fakeImage.path } as never)
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error('missing'), { name: 'NoSuchKey' }),
    )
    const app = Fastify()
    app.register(serveUploadedImage)
    expect(
      (await app.inject({ method: 'GET', url: `/uploads/${fakeImage.path}` })).statusCode,
    ).toBe(404)
    await app.close()
  })
})

describe('POST /images', () => {
  it('returns 403 for GUEST', async () => {
    const app = buildAuthApp('GUEST')
    const res = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': 'multipart/form-data; boundary=----boundary' },
      payload: '------boundary--',
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when no file is provided', async () => {
    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': 'multipart/form-data; boundary=----boundary' },
      payload: '------boundary--',
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/no file/i)
  })

  it('returns 400 for invalid MIME type', async () => {
    const boundary = '----testboundary'
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `hello world\r\n` +
      `--${boundary}--`

    const app = buildAuthApp('EDITOR')
    const res = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/invalid file type/i)
  })

  it('uploads image and returns 201', async () => {
    mockImage.create.mockResolvedValue({
      id: 'img-1',
      url: 'http://localhost:3001/uploads/img-1.webp',
    } as never)

    const boundary = '----testboundary'
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="photo.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n` +
      `fake-image-data\r\n` +
      `--${boundary}--`

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toHaveProperty('id')
    expect(res.json()).toHaveProperty('url')
    expect(mockImage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdById: 'user-1', type: 'INLINE' }),
      }),
    )
  })
})

describe('DELETE /images/:id', () => {
  it('allows owner to delete their image', async () => {
    mockImage.findFirst.mockResolvedValue({
      id: 'img-1',
      path: 'uploads/user-1/2024/01/abc.webp',
      createdById: 'user-1',
    } as never)
    mockImage.delete.mockResolvedValue(fakeImage as never)

    const { deleteFile } = await import('../../lib/storage.js')
    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({ method: 'DELETE', url: '/images/img-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Image deleted successfully' })
    expect(deleteFile).toHaveBeenCalledWith('uploads/user-1/2024/01/abc.webp')
  })

  it('allows admin to delete any image', async () => {
    mockImage.findFirst.mockResolvedValue({
      id: 'img-1',
      path: 'uploads/other-user/img.webp',
      createdById: 'other-user',
    } as never)
    mockImage.delete.mockResolvedValue(fakeImage as never)

    const app = buildAuthApp('ADMIN', 'admin-1')
    const res = await app.inject({ method: 'DELETE', url: '/images/img-1' })

    expect(res.statusCode).toBe(200)
  })

  it('returns 403 for non-owner non-admin', async () => {
    mockImage.findFirst.mockResolvedValue({
      id: 'img-1',
      path: 'uploads/other-user/img.webp',
      createdById: 'other-user',
    } as never)

    const app = buildAuthApp('EDITOR', 'user-1')
    const res = await app.inject({ method: 'DELETE', url: '/images/img-1' })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when image does not exist', async () => {
    mockImage.findFirst.mockResolvedValue(null)

    const app = buildAuthApp('ADMIN')
    const res = await app.inject({ method: 'DELETE', url: '/images/ghost' })

    expect(res.statusCode).toBe(404)
  })
})
