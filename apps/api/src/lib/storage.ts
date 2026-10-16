import { createReadStream } from 'node:fs'
import { mkdir, writeFile, rename, unlink, lstat } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'

import { env } from '../config/env.js'

export type StorageDriver = 's3' | 'local'
const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
  ...(env.AWS_ENDPOINT ? { endpoint: env.AWS_ENDPOINT, forcePathStyle: true } : {}),
})
export function localFile(key: string) {
  const root = path.resolve(env.LOCAL_STORAGE_PATH)
  const target = path.resolve(root, key)
  if (
    !key ||
    key.includes('\\') ||
    path.isAbsolute(key) ||
    target === root ||
    !target.startsWith(root + path.sep)
  )
    throw new Error('Invalid storage path')
  return target
}
async function checkedLocalFile(key: string) {
  const target = localFile(key)
  const root = path.resolve(env.LOCAL_STORAGE_PATH)
  const parts = path.relative(root, target).split(path.sep)
  let current = root
  for (const part of parts) {
    current = path.join(current, part)
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error('Invalid storage path: symbolic link')
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') throw error
    }
  }
  return target
}
export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
  driver: StorageDriver = env.STORAGE_DRIVER,
): Promise<void> {
  if (driver === 's3') {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.AWS_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
    return
  }
  const destination = await checkedLocalFile(key)
  await mkdir(path.dirname(destination), { recursive: true })
  const temporary = destination + '.' + randomUUID() + '.tmp'
  try {
    await writeFile(temporary, body, { flag: 'wx' })
    await rename(temporary, destination)
  } catch (error) {
    await unlink(temporary).catch(() => {})
    throw error
  }
}
export async function deleteFile(
  key: string,
  driver: StorageDriver = env.STORAGE_DRIVER,
): Promise<void> {
  if (driver === 's3') {
    await s3.send(new DeleteObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }))
    return
  }
  await unlink(await checkedLocalFile(key)).catch((error) => {
    if (error.code !== 'ENOENT') throw error
  })
}
export async function readFile(key: string, driver: StorageDriver = env.STORAGE_DRIVER) {
  if (driver === 's3') return s3.send(new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }))
  const file = await checkedLocalFile(key)
  const { stat } = await import('node:fs/promises')
  try {
    await stat(file)
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT')
      throw Object.assign(new Error('File not found'), { name: 'NoSuchKey' })
    throw error
  }
  return { Body: createReadStream(file) }
}
export async function getSignedUrl(
  key: string,
  expiresIn = 3600,
  driver: StorageDriver = env.STORAGE_DRIVER,
): Promise<string> {
  if (driver === 'local') {
    localFile(key)
    return `${env.API_URL.replace(/\/$/, '')}/uploads/${key}`
  }
  return awsGetSignedUrl(s3, new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }), {
    expiresIn,
  })
}

export async function storageExists(key: string, driver: StorageDriver): Promise<boolean> {
  try {
    if (driver === 's3') await s3.send(new HeadObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }))
    else if (!(await lstat(await checkedLocalFile(key))).isFile()) throw new Error('Not a file')
    return true
  } catch (error) {
    const value = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } }
    if (
      value.code === 'ENOENT' ||
      value.name === 'NoSuchKey' ||
      value.name === 'NotFound' ||
      value.$metadata?.httpStatusCode === 404
    )
      return false
    throw error
  }
}
export async function* storageFiles(driver: StorageDriver): AsyncGenerator<string> {
  if (driver === 's3') {
    let token: string | undefined
    do {
      const result = await s3.send(
        new ListObjectsV2Command({
          Bucket: env.AWS_BUCKET,
          Prefix: 'uploads/',
          ContinuationToken: token,
        }),
      )
      for (const item of result.Contents ?? []) if (item.Key) yield item.Key
      token = result.IsTruncated ? result.NextContinuationToken : undefined
    } while (token)
  } else {
    const { readdir } = await import('node:fs/promises')
    async function* walk(key: string): AsyncGenerator<string> {
      let entries
      try {
        entries = await readdir(await checkedLocalFile(key), { withFileTypes: true })
      } catch (error) {
        if ((error as { code?: string }).code === 'ENOENT') return
        throw error
      }
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue
        const child = key + '/' + entry.name
        if (entry.isDirectory()) yield* walk(child)
        else if (entry.isFile()) yield child
      }
    }
    yield* walk('uploads')
  }
}
