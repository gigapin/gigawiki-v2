# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task workflow

**Start every session by reading `/docs/SESSION_LOG.md`** — it records what each session did, what is in progress, and where the code deviates from the task specs. It is the starting point; the task list is the reference.

When asked to complete a specific numbered task (e.g. "complete task 12"), **always read `/docs/GIGAWIKI_V2_TASKS.md` first** to get the full specification before writing any code.

At the end of a session, add an entry at the top of the "Log delle sessioni" section in `/docs/SESSION_LOG.md` and update its status table if any task advanced.

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
# NOTE: this also builds and runs the API, because docker-compose.override.yml
# is merged automatically. For the backing services only:
#   docker compose -f docker-compose.yml up -d
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

**Route structure:** Each route group lives in `src/routes/<resource>/`. Each CRUD operation is a named export (e.g. `createUser`, `fetchUser`) that accepts a `FastifyInstance` and registers exactly one HTTP handler. Routes are registered in `app.ts` via `src/routes/index.ts`.

**Auth:** JWT via `@fastify/jwt`. The `authJwtPlugin` in `src/plugins/auth.ts` registers the plugin and decorates the instance with `fastify.authenticate`. All routes under the `/api/v2` prefix are wrapped in a `preHandler` hook that calls `app.authenticate`. The JWT payload shape (`{ id, email, role }`) is declared in `src/types.d.ts` via module augmentation.

**Database:** Prisma 7 with the `@prisma/adapter-pg` driver adapter (connection via `DATABASE_URL`). The singleton client is in `src/lib/prisma.ts`. Schema is at `apps/api/prisma/schema.prisma`.

**Environment:** `src/lib/env.ts` loads the root `.env` file using `process.loadEnvFile`. Import this module first in `server.ts`.

**Passwords:** argon2id with `memoryCost: 65536, timeCost: 3, parallelism: 4`.

**Slugs:** Generated from `name` via `slugify({ lower: true, strict: true })` on create; stored as unique fields.

**Prisma error P2002** (unique constraint violation) is caught explicitly and returned as `409`.

### Plugins (`apps/api/src/plugins/`)

All cross-cutting plugins are registered before routes. Registration order in `app.ts`: helmet → cors → cookie → rate-limit → jwt → multipart.

- `auth.ts` — JWT + cookie. Decorates `fastify.authenticate` and `fastify.requireRole(role)`.
- `cors.ts` — CORS with `FRONTEND_URL` origin, credentials enabled.
- `helmet.ts` — security headers; CSP disabled in development.
- `multipart.ts` — file uploads, 10 MB limit.
- `rate-limit.ts` — Redis-backed; 100 req/min default, 10 req/min on auth routes.

### Library singletons (`apps/api/src/lib/`)

- `prisma.ts` — singleton `PrismaClient` with hot-reload guard.
- `redis.ts` — `ioredis` client from `REDIS_URL`.
- `storage.ts` — S3/MinIO client; exports `uploadFile`, `deleteFile`, `getSignedUrl`.
- `mailer.ts` — nodemailer transport; no-op in `NODE_ENV=test`.
- `queue.ts` — BullMQ `emailQueue` and `imageQueue`.
- `env.ts` — Zod-validated env at startup.

### Data model (key hierarchy)

```
User → Subject → Project → Section → Page
                                       └── Revision (versioning)
```

`Comment`, `Tag`, `Favorite`, `View`, `Activity` are polymorphic — they carry optional FKs for `pageId`, `projectId`, `sectionId` (only one set per row).

`Visibility` enum: `PUBLIC | PRIVATE`. `Role` enum: `ADMIN | EDITOR | GUEST`. GUESTs are blocked from mutating resources (enforced in route handlers, not middleware).

### API routes implemented

All routes live under `/api/v2`.

| Module | Files | Status |
|---|---|---|
| Auth | `src/routes/auth/authRoutes.ts` | Done |
| Users | `src/routes/users/usersRoutes.ts` | Done |
| Subjects | `src/routes/subjects/` | Done |
| Projects | `src/routes/projects/` | Done |
| Sections | `src/routes/sections/` | Done |
| Pages | `src/routes/pages/` | Done |
| Revisions | `src/routes/revisions/` | Done |
| Comments | `src/routes/comments/` | Done |
| Tags | `src/routes/tags/` | Done |
| Favorites | `src/routes/favorites/` | Done |
| Views | `src/routes/views/` | Done |
| Activities | `src/routes/activities/` | Done |
| Images | `src/routes/images/` | Done |

### Shared package (`packages/shared`)

Contains TypeScript types in `src/types/` and Zod schemas in `src/schemas/`. Import these in both `apps/api` and `apps/web` to keep contracts in sync.

**Types:** `activity`, `comment`, `favorite`, `image`, `page`, `pagination`, `project`, `revision`, `section`, `subject`, `tag`, `user`.

**Schemas:** `auth.schema`, `comment.schema`, `page.schema`, `pagination.schema`, `project.schema`, `section.schema`, `subject.schema`, `tag.schema`, `user.schema`.

### Frontend (`apps/web`)

React 19 + Vite. Stack: TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui.

**Current state:** Frontend is bootstrapped with Vite + Tailwind + shadcn/ui. The following shadcn components are installed: `Avatar`, `Badge`, `Button`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Label`, `Select`, `Separator`, `Skeleton`, `Switch`, `Table`, `Textarea`, `Tooltip`. Path aliases `@` → `src/` and `@shared` → `../../packages/shared/src` are configured.

`src/App.tsx` currently renders a placeholder landing screen. Full page/routing implementation begins at Task 25.

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
