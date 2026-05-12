import { FastifyInstance } from 'fastify'
import * as argon2 from 'argon2'

import { prisma } from '../../lib/prisma.js'

type UserBodyType = {
  email: string
  password: string
}

async function verifyPassword(password: string) {
  try {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })

    return await argon2.verify(hash, password)
  } catch (error: unknown) {
    if (error) {
      return false
    }
  }
}

export function login(fastify: FastifyInstance) {
  fastify.post<{ Body: UserBodyType }>('/login', async (request, reply) => {
    const data = request.body

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (!user) {
      return reply.code(404).send({ message: 'User not found' })
    }

    const authenticated = await verifyPassword(data.password)
    if (!authenticated) {
      return reply
        .code(401)
        .send({ message: 'Authentication failed, please try again typing the password' })
    }

    const token = fastify.jwt.sign({
      payload: { email: data.email, id: user.id, role: user.role },
    })

    return reply.status(200).send({ token })
  })
}
