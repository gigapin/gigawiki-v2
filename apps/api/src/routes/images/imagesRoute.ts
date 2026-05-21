import { FastifyInstance } from 'fastify'
import { ImageType } from '@prisma/client'
import sharp from 'sharp'
import { nanoid } from 'nanoid'

import { prisma } from '../../lib/prisma.js'
import { uploadFile, deleteFile } from '../../lib/storage.js'
import { env } from '../../config/env.js'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

type ImageIdParams = { id: string }
type UploadQuery = { type?: string }

export async function uploadImage(fastify: FastifyInstance) {
  fastify.post<{ Querystring: UploadQuery }>('/images', async (req, reply) => {
    if (req.user.role === 'GUEST') {
      return reply.status(403).send({ error: 'Editor or Admin role required' })
    }

    const data = await req.file()
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' })
    }

    if (!ALLOWED_MIME.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type. Allowed: jpeg, png, webp, gif' })
    }

    const imageType = (req.query.type?.toUpperCase() as ImageType) ?? ImageType.INLINE
    const buffer = await data.toBuffer()

    let processedBuffer: Buffer

    if (imageType === ImageType.AVATAR) {
      processedBuffer = await sharp(buffer)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer()
    } else {
      processedBuffer = await sharp(buffer)
        .resize({ width: 2000, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const key = `uploads/${req.user.id}/${year}/${month}/${nanoid(10)}.webp`

    await uploadFile(key, processedBuffer, 'image/webp')

    const url = `${env.API_URL.replace(/\/$/, '')}/uploads/${key}`

    const image = await prisma.image.create({
      data: {
        name: data.filename ?? key,
        url,
        path: key,
        type: imageType,
        createdById: req.user.id,
      },
      select: { id: true, url: true },
    })

    return reply.status(201).send(image)
  })
}

export async function deleteImage(fastify: FastifyInstance) {
  fastify.delete<{ Params: ImageIdParams }>('/images/:id', async (req, reply) => {
    const { id } = req.params

    const image = await prisma.image.findFirst({
      where: { id },
      select: { id: true, path: true, createdById: true },
    })

    if (!image) {
      return reply.status(404).send({ error: 'Image not found' })
    }

    const isOwner = image.createdById === req.user.id
    const isAdmin = req.user.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    await deleteFile(image.path)
    await prisma.image.delete({ where: { id } })

    return reply.status(200).send({ message: 'Image deleted successfully' })
  })
}
