# GiGaWiki V2

A modern, self-hosted wiki built with Fastify, React, PostgreSQL, and TypeScript in a Turborepo monorepo.

## Prerequisites

- Node.js 22
- pnpm
- Docker

## First-time Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/your-org/gigawiki-v2
cd gigawiki-v2
pnpm install

# 2. Start local services (PostgreSQL + Redis + MinIO)
docker compose up -d

# 3. Copy env and configure
cp .env.example apps/api/.env

# 4. Run migrations and seed
cd apps/api && pnpm prisma migrate dev && pnpm prisma db seed && cd ../..

# 5. Start dev servers
pnpm dev
```

## Stack

- **Backend**: Fastify + TypeScript + Prisma + PostgreSQL + Redis
- **Frontend**: React 18 + Vite + TanStack Router + TanStack Query + Tailwind CSS + shadcn/ui
- **Shared**: Zod schemas and TypeScript types in `packages/shared`
- **Monorepo**: Turborepo + pnpm workspaces
