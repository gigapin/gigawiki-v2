import * as path from 'path'
import { fileURLToPath } from 'url'

import { z } from 'zod'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.loadEnvFile(path.resolve(__dirname, '../../../../.env'))

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  API_URL: z.string().min(1),
  APP_URL: z.string().min(1),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  STORAGE_DRIVER: z.enum(['s3', 'local']).default('s3'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_BUCKET: z.string().min(1),
  AWS_ENDPOINT: z.string().optional(),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  SMTP_FROM_NAME: z.string().default('GiGaWiki'),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>
