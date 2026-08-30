import * as path from 'path'

import { defineConfig } from 'prisma/config'

// Local development reads the repo-root .env. In a container there is no such file and
// the environment is supplied directly, so a missing .env must not abort `prisma generate`.
try {
  process.loadEnvFile(path.resolve(process.cwd(), '../../.env'))
} catch {
  // no .env on disk — fall back to the ambient environment
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.DATABASE_URL! },
})
