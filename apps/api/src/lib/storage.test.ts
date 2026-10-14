import { mkdtemp, readFile as fsReadFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const config = vi.hoisted(() => ({
  LOCAL_STORAGE_PATH: '',
  STORAGE_DRIVER: 'local' as const,
  API_URL: 'http://localhost:3001',
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  AWS_BUCKET: '',
}))
const send = vi.hoisted(() => vi.fn().mockResolvedValue({ Body: 'remote' }))
vi.mock('../config/env.js', () => ({ env: config }))
vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const original = await importOriginal<typeof import('@aws-sdk/client-s3')>()
  return {
    ...original,
    S3Client: class {
      send = send
    },
  }
})
import { deleteFile, getSignedUrl, localFile, readFile, uploadFile } from './storage.js'

beforeAll(async () => {
  config.LOCAL_STORAGE_PATH = await mkdtemp(path.join(tmpdir(), 'gigawiki-storage-'))
})
afterAll(async () => {
  await rm(config.LOCAL_STORAGE_PATH, { recursive: true, force: true })
})
describe('asset driver persistence', () => {
  it('writes, streams and deletes a local upload', async () => {
    const key = 'uploads/user/2026/image.webp'
    await uploadFile(key, Buffer.from('pixels'), 'image/webp')
    expect(await fsReadFile(localFile(key), 'utf8')).toBe('pixels')
    const { Body } = await readFile(key, 'local')
    const chunks: Buffer[] = []
    for await (const chunk of Body as AsyncIterable<Buffer>) chunks.push(chunk)
    expect(Buffer.concat(chunks).toString()).toBe('pixels')
    expect(await getSignedUrl(key, 60, 'local')).toBe(`http://localhost:3001/uploads/${key}`)
    await deleteFile(key, 'local')
    await expect(readFile(key, 'local')).rejects.toMatchObject({ name: 'NoSuchKey' })
    await deleteFile(key, 'local')
  })
  it.each(['', '../outside', '/outside', 'uploads/../../../outside', 'uploads\\outside'])(
    'rejects path %s',
    (key) => {
      expect(() => localFile(key)).toThrow('Invalid storage path')
    },
  )
  it('rejects storage paths through symbolic links', async () => {
    await symlink(tmpdir(), path.join(config.LOCAL_STORAGE_PATH, 'escape'))
    await expect(
      uploadFile('escape/forbidden.webp', Buffer.from('pixels'), 'image/webp'),
    ).rejects.toThrow('Invalid storage path')
    await expect(readFile('escape/forbidden.webp', 'local')).rejects.toThrow('Invalid storage path')
    await expect(deleteFile('escape/forbidden.webp', 'local')).rejects.toThrow(
      'Invalid storage path',
    )
  })
  it('reads and deletes existing S3 assets even with a local default', async () => {
    send.mockClear()
    expect(await readFile('old.webp', 's3')).toEqual({ Body: 'remote' })
    await deleteFile('old.webp', 's3')
    expect(send).toHaveBeenCalledTimes(2)
  })
})
