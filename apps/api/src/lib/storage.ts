import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'

import { env } from '../config/env.js'

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  ...(env.AWS_ENDPOINT ? { endpoint: env.AWS_ENDPOINT, forcePathStyle: true } : {}),
})

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }))
}

export async function readFile(key: string) {
  return s3.send(new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }))
}

export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return awsGetSignedUrl(s3, new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }), {
    expiresIn,
  })
}
