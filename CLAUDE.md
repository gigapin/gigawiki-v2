# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Start all dev servers (API + Web via Turborepo)
pnpm dev

# Run all tests
pnpm test

# Run API tests only (from repo root)
pnpm --filter gigawiki-v2-api test

# Run a single test file
cd apps/api && pnpm vitest run src/routes/users/usersRoutes.test.ts

# Lint
pnpm lint

# Typecheck
pnpm typecheck

# Prisma migrations
cd apps/api && pnpm prisma migrate dev
cd apps/api && pnpm prisma db seed

# Start infrastructure services (PostgreSQL on 5433, Redis on 6379, MinIO on 9002)
docker compose up -d
```

Node.js version: **22** (see `.nvmrc`). Package manager: **pnpm**.

## Architecture

Turborepo monorepo with three packages:

- `apps/api` — Fastify 5 REST API (TypeScript, ESM)
- `apps/web` — React 19 + Vite frontend (TypeScript, ESM)
- `packages/shared` — Shared Zod schemas and TypeScript types consumed by both apps

### API (`apps/api`)

**Entry points:** `src/server.ts` starts the Fastify server on port 3001; `src/app.ts` builds and exports the `fastify` instance with all plugins and routes registered.

**Route structure:** Each route group lives in `src/routes/<resource>/`. Each CRUD operation is a named export (e.g. `createUser`, `fetchUser`) that accepts a `FastifyInstance` and registers exactly one HTTP handler. Routes are registered in `app.ts`.

**Auth:** JWT via `@fastify/jwt`. The `authJwtPlugin` in `src/plugins/auth.ts` registers the plugin and decorates the instance with `fastify.authenticate`. All routes under the `/api/v2` prefix are wrapped in a `preHandler` hook that calls `app.authenticate`. The JWT payload shape (`{ id, email, role }`) is declared in `src/types.d.ts` via module augmentation.

**Database:** Prisma 7 with the `@prisma/adapter-pg` driver adapter (connection via `DATABASE_URL`). The singleton client is in `src/lib/prisma.ts`. Schema is at `apps/api/prisma/schema.prisma`.

**Environment:** `src/lib/env.ts` loads the root `.env` file using `process.loadEnvFile`. Import this module first in `server.ts`.

**Passwords:** argon2id with `memoryCost: 65536, timeCost: 3, parallelism: 4`.

**Slugs:** Generated from `name` via `slugify({ lower: true, strict: true })` on create; stored as unique fields.

**Prisma error P2002** (unique constraint violation) is caught explicitly and returned as `409`.

### Data model (key hierarchy)

```
User → Subject → Project → Section → Page
                                       └── Revision (versioning)
```

`Comment`, `Tag`, `Favorite`, `View`, `Activity` are polymorphic — they carry optional FKs for `pageId`, `projectId`, `sectionId` (only one set per row).

`Visibility` enum: `PUBLIC | PRIVATE`. `Role` enum: `ADMIN | EDITOR | GUEST`. GUESTs are blocked from mutating resources (enforced in route handlers, not middleware).

### Shared package (`packages/shared`)

Contains TypeScript types in `src/types/` and Zod schemas in `src/schemas/`. Import these in both `apps/api` and `apps/web` to keep contracts in sync.

### Frontend (`apps/web`)

React 19 + Vite. Planned stack (per README): TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui.

### Infrastructure

| Service    | Local port | Docker image        |
|------------|-----------|---------------------|
| PostgreSQL | 5433      | postgres:16-alpine  |
| Redis      | 6379      | redis:7-alpine      |
| MinIO      | 9002      | minio/minio         |

MinIO bucket `gigawiki` is created automatically on first `docker compose up`.

## Code style

Prettier: no semicolons, single quotes, trailing commas, 100-char print width, 2-space indent. ESLint config at root `eslint.config.cjs`. Commits follow Conventional Commits (enforced by commitlint + husky).

## Testing

API tests use Vitest with Fastify's `app.inject()` — no real HTTP or database. Prisma and argon2 are mocked with `vi.mock`. The pattern in `usersRoutes.test.ts` is the canonical example to follow for new route tests.
