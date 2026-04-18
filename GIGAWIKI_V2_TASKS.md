# GiGaWiki V2 — Detailed Task List

> Implementation roadmap for building GiGaWiki V2 from scratch.
> Tasks are ordered by dependency — complete each phase before moving to the next.

---

## Table of Contents

- [Phase 1 — Repo & Tooling](#phase-1--repo--tooling)
- [Phase 2 — Shared Package](#phase-2--shared-package)
- [Phase 3 — Backend (apps/api)](#phase-3--backend-appsapi)
- [Phase 4 — Frontend (apps/web)](#phase-4--frontend-appsweb)
- [Phase 5 — Tests, CI/CD & GitHub](#phase-5--tests-cicd--github)

---

## Phase 1 — Repo & Tooling

### Task 1 — Initialize monorepo with Turborepo + pnpm workspaces

**Goal:** Create the root skeleton that every other task builds on top of.

**Files to create:**

- `package.json` (root) — declare `"workspaces": ["apps/*", "packages/*"]`, add root-level scripts (`dev`, `build`, `test`, `lint`, `typecheck`) that delegate to Turborepo.
- `turbo.json` — define the pipeline:
  - `build` depends on `^build` (build dependencies first)
  - `dev` runs with `cache: false` and `persistent: true`
  - `test`, `lint`, `typecheck` run in parallel with no dependency
- `tsconfig.base.json` — shared TypeScript config (`target: ES2022`, `moduleResolution: bundler`, `strict: true`, `skipLibCheck: true`). All sub-packages extend this.
- `pnpm-workspace.yaml` — list `apps/*` and `packages/*`.
- `.nvmrc` — pin Node.js version to `22`.
- `.gitignore` — ignore `node_modules`, `dist`, `.env`, `.turbo`, `coverage`, `*.tsbuildinfo`.
- `.env.example` — copy of every environment variable from section 14 of the tech stack doc, with placeholder values and inline comments.
- `README.md` — project overview, prerequisites (Node 22, pnpm, Docker), and the five setup commands from section 15.

**Commands to verify:**
```bash
pnpm install          # workspace install resolves with no errors
pnpm turbo --version  # confirms Turborepo is available
```

---

### Task 2 — Create docker-compose.yml for local services

**Goal:** One `docker compose up -d` starts every external service needed for local development.

**File to create:** `docker-compose.yml` at the root.

**Services to define:**

- **postgres** — `postgres:16-alpine`, port `5432:5432`, env `POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_DB=gigawiki`, named volume `postgres_data:/var/lib/postgresql/data`.
- **redis** — `redis:7-alpine`, port `6379:6379`, named volume `redis_data:/data`, append-only persistence enabled via command `redis-server --appendonly yes`.
- **minio** — `minio/minio`, command `server /data --console-address ":9001"`, ports `9000:9000` (API) and `9001:9001` (web console), env `MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin`, named volume `minio_data:/data`.
- **minio-init** — one-shot service using `minio/mc` image that waits for MinIO to be ready, then creates the `gigawiki` bucket and sets it to public read policy. Use `depends_on: minio` and `restart: on-failure`.

**Also add** a `healthcheck` to the postgres service so that dependent services (like the API in CI) can wait until Postgres is truly ready.

**Commands to verify:**
```bash
docker compose up -d
docker compose ps          # all services should show "running" or "healthy"
docker compose logs minio  # confirm bucket created
```

---

### Task 3 — Set up code quality tooling (ESLint, Prettier, Husky, Commitlint)

**Goal:** Enforce consistent code style and conventional commit messages across the entire monorepo automatically on every commit.

**Files to create:**

- `.eslintrc.cjs` (root) — extend `@typescript-eslint/recommended`, enable `import/order` rule, configure `no-console` as a warning, set `parserOptions.project` to all `tsconfig.json` files in the repo.
- `.prettierrc` — `{ "semi": false, "singleQuote": true, "trailingComma": "all", "printWidth": 100, "tabWidth": 2 }`.
- `.prettierignore` — ignore `dist`, `node_modules`, `*.md`, `*.prisma`.
- `.commitlintrc.cjs` — `module.exports = { extends: ['@commitlint/config-conventional'] }`. Allowed types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`, `build`.
- `.husky/pre-commit` — run `pnpm lint-staged`.
- `.husky/commit-msg` — run `pnpm commitlint --edit $1`.
- `lint-staged.config.cjs` — on `*.{ts,tsx}`: run `eslint --fix` then `prettier --write`; on `*.{json,md,yml}`: run `prettier --write`.

**Dev dependencies to install at root:**
```
eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
eslint-plugin-import prettier
husky lint-staged
@commitlint/cli @commitlint/config-conventional
```

**Setup commands:**
```bash
pnpm dlx husky init    # creates .husky/ directory
```

**Verify:** Make a commit with message `bad message` — it should be rejected. Make one with `feat: init repo` — it should pass.

---

## Phase 2 — Shared Package

### Task 4 — Build packages/shared — types and Zod schemas

**Goal:** A single source of truth for all TypeScript types and Zod validation schemas, imported by both the API and the web app, preventing duplication and drift.

**Directory structure:**
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── index.ts          # re-exports everything
│   │   ├── user.ts
│   │   ├── subject.ts
│   │   ├── project.ts
│   │   ├── section.ts
│   │   ├── page.ts
│   │   ├── revision.ts
│   │   ├── comment.ts
│   │   ├── tag.ts
│   │   ├── favorite.ts
│   │   ├── activity.ts
│   │   ├── image.ts
│   │   └── pagination.ts
│   └── schemas/
│       ├── index.ts
│       ├── auth.schema.ts
│       ├── user.schema.ts
│       ├── subject.schema.ts
│       ├── project.schema.ts
│       ├── section.schema.ts
│       ├── page.schema.ts
│       ├── comment.schema.ts
│       ├── tag.schema.ts
│       └── pagination.schema.ts
├── package.json
└── tsconfig.json
```

**Types to define** (each file exports the full entity type matching the Prisma model, plus a `CreateXDto` and `UpdateXDto` type):

- `User` — id, name, email, slug, role (`ADMIN | EDITOR | GUEST`), avatarId, emailConfirmed, createdAt, updatedAt. Omit `password` from the public type.
- `Subject`, `Project`, `Section` — all fields including `visibility`, `deletedAt`, nested `image?`.
- `Page` — all fields, `isDraft`, `restricted`, `currentRevision`, nested `createdBy`, `updatedBy`, `ownedBy` (as `UserPublic`).
- `Revision` — id, pageId, revisionNumber, title, content, slug, summary, createdBy, createdAt.
- `Comment` — id, body, userId, user (public), parentId, replies, createdAt. Plus polymorphic `pageId?`, `projectId?`, `sectionId?`.
- `Tag`, `Favorite`, `Activity` — as per Prisma schema.
- `PaginatedResponse<T>` — generic wrapper: `{ data: T[], meta: { page, perPage, total, totalPages } }`.
- `ApiResponse<T>` — `{ success: true, data: T }` | `{ success: false, error: { code, message, details? } }`.

**Zod schemas to define:**

- `auth.schema.ts` — `LoginSchema` (email, password), `RegisterSchema` (name, email, password min 8 chars), `ForgotPasswordSchema`, `ResetPasswordSchema` (token, newPassword), `InviteSchema`.
- `page.schema.ts` — `CreatePageSchema` (title required, content, sectionId, isDraft), `UpdatePageSchema` (all optional), `PageQuerySchema` (page, perPage, sort, order, isDraft?, visibility?, projectId?, sectionId?, search?).
- `pagination.schema.ts` — reusable `PaginationSchema` (page default 1, perPage default 20 max 100, sort, order asc/desc).
- Similar create/update schemas for subjects, projects, sections, comments.

**package.json** — `"main": "src/index.ts"`, `"exports"` pointing to src for direct TS imports within the monorepo. Add `zod` as a dependency.

---

## Phase 3 — Backend (apps/api)

### Task 5 — Bootstrap apps/api — Fastify + TypeScript project

**Goal:** A running Fastify server that responds to `GET /health` and loads config from environment variables.

**Files to create:**

- `apps/api/package.json` — dependencies: `fastify`, `@fastify/jwt`, `@fastify/cookie`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/helmet`, `@fastify/multipart`, `@prisma/client`, `zod`, `bcryptjs`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp`, `bullmq`, `nodemailer`, `@react-email/render`, `slugify`, `dayjs`, `nanoid`, `pino`. Dev: `prisma`, `tsx`, `typescript`, `@types/node`, `@types/bcryptjs`, `@types/nodemailer`, `vitest`.
- `apps/api/tsconfig.json` — extends `../../tsconfig.base.json`, sets `outDir: dist`, `rootDir: src`.
- `apps/api/src/config/env.ts` — use Zod to parse and validate `process.env`. Export a typed `env` object. Throw at startup if any required variable is missing. Include all variables from section 14: `NODE_ENV`, `PORT`, `APP_URL`, `FRONTEND_URL`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `STORAGE_DRIVER`, `AWS_*`, `SMTP_*`.
- `apps/api/src/app.ts` — create and export the Fastify instance. Register all plugins (imported from `./plugins/`). Register all module routes under `/api/v1`. Add a global error handler that formats errors into the standard response envelope (`{ success: false, error: { code, message, details? } }`). Map Zod errors to 400, Prisma `P2002` (unique constraint) to 409, `P2025` (not found) to 404.
- `apps/api/src/server.ts` — import the app, call `app.listen({ port: env.PORT, host: '0.0.0.0' })`, log the listening URL. Export nothing — this is the entry point only.

**Health check route** — register `GET /health` directly in `app.ts` returning `{ status: 'ok', uptime: process.uptime() }`.

**Verify:**
```bash
cd apps/api && pnpm tsx src/server.ts
curl http://localhost:3001/health   # should return { status: 'ok' }
```

---

### Task 6 — Register Fastify plugins

**Goal:** All cross-cutting concerns (security headers, CORS, rate limiting, JWT, file uploads) are configured as Fastify plugins before any route is registered.

**Files to create in `apps/api/src/plugins/`:**

- `cors.ts` — register `@fastify/cors` with `origin: env.FRONTEND_URL`, `credentials: true`, allowed methods `GET POST PUT PATCH DELETE OPTIONS`, allowed headers `Content-Type Authorization`.
- `auth.ts` — register `@fastify/jwt` with `secret: env.JWT_SECRET` and `sign.expiresIn: env.JWT_ACCESS_EXPIRES_IN`. Register `@fastify/cookie` with `secret` for signed cookies. Decorate the Fastify instance with an `authenticate` preHandler that verifies the JWT and attaches `request.user` (`{ id, email, role }`). Also add a `requireRole(role: Role)` decorator for role-based access control checks.
- `rate-limit.ts` — register `@fastify/rate-limit` with Redis as store (use the Redis client from `lib/redis.ts`). Default: 100 requests per minute per IP. Auth routes: 10 requests per minute (stricter, passed as route-level option).
- `multipart.ts` — register `@fastify/multipart` with `limits: { fileSize: 10 * 1024 * 1024 }` (10 MB max).
- `helmet.ts` — register `@fastify/helmet` with default settings. In development, disable `contentSecurityPolicy`.

**In `app.ts`** — import and register plugins in order: helmet → cors → cookie → rate-limit → jwt → multipart.

---

### Task 7 — Set up Prisma schema and initial migration

**Goal:** A fully defined database schema with all 15 models, all relations, all indexes, all enums — exactly as specified in section 7 of the tech stack doc.

**Files to create:**

- `apps/api/prisma/schema.prisma` — copy the full schema from the tech stack doc verbatim. Double-check all relations are bidirectional and all `@relation` names are consistent (e.g. `"UserAvatar"`, `"ImageCreatedBy"`).

**Steps:**
1. Set `DATABASE_URL` in `apps/api/.env`.
2. Run `pnpm prisma migrate dev --name init` — this creates `prisma/migrations/TIMESTAMP_init/migration.sql`.
3. Run `pnpm prisma generate` — generates the typed Prisma Client.
4. Open `pnpm prisma studio` and verify all tables exist with the correct columns.

**Things to double-check in the schema:**
- `Page` has `projectId` (direct, for easy querying without join through section) and `sectionId` (cascade delete).
- `Comment`, `Tag`, `Favorite`, `View`, `Activity` all have three nullable polymorphic FK columns — only one is ever populated at runtime.
- `RefreshToken` is separate from the `User` model (not a relation — queried by token string only).
- All `@@map` names use snake_case (e.g. `@@map("email_invites")`).
- Indexes exist on all FK columns and on `slug`, `deletedAt`, `isDraft`.

---

### Task 8 — Add PostgreSQL full-text search migration for pages

**Goal:** Pages can be searched by a ranked full-text query without any external search engine in Phase 1.

**Steps:**

1. Create a new Prisma migration file manually:
   ```bash
   pnpm prisma migrate dev --name add_fts_to_pages --create-only
   ```
2. Edit the generated `migration.sql` to add:
   ```sql
   ALTER TABLE pages
     ADD COLUMN search_vector tsvector
     GENERATED ALWAYS AS (
       to_tsvector('english',
         coalesce(title, '') || ' ' || coalesce(content, '')
       )
     ) STORED;

   CREATE INDEX pages_search_vector_idx ON pages USING gin(search_vector);
   ```
3. Run `pnpm prisma migrate dev` to apply it.
4. In `schema.prisma`, add `searchVector Unsupported("tsvector")?` to the `Page` model (Prisma needs this to not drop the column on future migrations).

**Search query implementation** (used in the pages module):
```typescript
// In pages.service.ts
const results = await prisma.$queryRaw`
  SELECT id, title, slug, "sectionId", "projectId",
         ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
  FROM pages
  WHERE search_vector @@ plainto_tsquery('english', ${query})
    AND "deletedAt" IS NULL
    AND visibility = 'PUBLIC'
  ORDER BY rank DESC
  LIMIT 20
`
```

---

### Task 9 — Create lib singletons

**Goal:** All external service clients are initialized once and reused across modules, with proper connection error handling at startup.

**Files to create in `apps/api/src/lib/`:**

- `prisma.ts` — export a single `PrismaClient` instance. Add `$on('query', ...)` logging in development. Use the Node.js global trick to prevent multiple instances during `tsx` hot-reload: `const globalForPrisma = global as typeof global & { prisma?: PrismaClient }`.
- `redis.ts` — create an `ioredis` client from `env.REDIS_URL`. Listen for `error` events and log them. Export the client. Also export a `connectRedis()` function called at server startup.
- `storage.ts` — create an `S3Client` with credentials and region from env. If `env.AWS_ENDPOINT` is set, pass it as the endpoint (MinIO dev mode). Export `uploadFile(key, buffer, contentType)`, `deleteFile(key)`, and `getSignedUrl(key, expiresIn)` helper functions that wrap the AWS SDK calls.
- `mailer.ts` — create a `nodemailer.createTransport` instance from SMTP env vars. Export a `sendMail({ to, subject, html })` function. In development, log the email to console if `NODE_ENV=test` to avoid actually sending.
- `queue.ts` — create named BullMQ `Queue` instances: `emailQueue` and `imageQueue`. Export both queues. Workers are registered separately in `src/workers/`.
- `slugify.ts` — export a `generateSlug(text: string)` function using the `slugify` package with options `{ lower: true, strict: true }`. Export a `generateUniqueSlug(text, checkExists: (slug) => Promise<boolean>)` function that appends a `nanoid(6)` suffix if the base slug is already taken.

---

### Task 10 — Implement auth module

**Goal:** A complete, secure authentication system with short-lived JWT access tokens and long-lived HttpOnly refresh tokens.

**Files to create in `apps/api/src/modules/auth/`:**

- `auth.schema.ts` — re-export or define Zod schemas for each endpoint (import from `packages/shared`). Add server-side-only schemas like `RefreshTokenBodySchema` (just reads from cookie, no body).
- `auth.service.ts` — implement all business logic:
  - `login(email, password)` — find user by email, compare password with `bcryptjs.compare`, create a `RefreshToken` record in DB with `expiresAt = now + 30d`, sign and return `{ accessToken, refreshToken }`.
  - `logout(refreshToken)` — mark the `RefreshToken` as revoked (`revokedAt = now`).
  - `refresh(refreshToken)` — find the `RefreshToken` record, check it's not expired and not revoked, look up the user, issue a new `accessToken` (and optionally rotate the refresh token — delete old, create new).
  - `register(name, email, password)` — check if self-registration is enabled (via settings), hash password with `bcryptjs.hash(password, 12)`, create user with `role: GUEST`, generate slug from name, queue a `VerifyEmailEmail` job, return `{ accessToken, refreshToken }`.
  - `forgotPassword(email)` — find user, generate a secure random token with `nanoid(32)`, store it in Redis with `SET reset:{token} {userId} EX 3600`, queue a `ResetPasswordEmail` job. Always return 200 even if email not found (prevents enumeration).
  - `resetPassword(token, newPassword)` — look up `reset:{token}` in Redis, hash new password, update user, delete token from Redis.
  - `verifyEmail(token)` — similar pattern using `verify:{token}` in Redis. Set `emailVerifiedAt` and `emailConfirmed = true`.
  - `acceptInvite(token, name, password)` — find `EmailInvite` by token, check not expired and `acceptedAt` is null, create user with the invite's role, set `acceptedAt = now`.
  - `me(userId)` — return user with avatar relation, omitting password.

- `auth.routes.ts` — register all routes from section 9. Apply the stricter rate limit (10 req/min) to POST routes. Set the refresh token as an HttpOnly, `Secure` (in production), `SameSite=Strict` cookie with `path: /api/v1/auth/refresh`. Clear the cookie on logout.

---

### Task 11 — Implement users module

**Goal:** Admins can manage all users; regular users can view and update their own profile.

**Files:** `src/modules/users/users.routes.ts`, `users.service.ts`, `users.schema.ts`.

**Endpoints:**
- `GET /api/v1/users` — Admin only. Paginated list. Filter by `role`, search by `name` or `email`. Return users without passwords.
- `GET /api/v1/users/:id` — Authenticated. Return public profile. If `:id === 'me'` resolve to the authenticated user's ID.
- `PATCH /api/v1/users/:id` — User can update own `name`, `email` (triggers re-verification), `password`. Admin can update any user's `role`. Validate that non-admins cannot change `role`.
- `DELETE /api/v1/users/:id` — Admin only. Hard-delete the user. Cascade will handle related records.
- `POST /api/v1/users/:id/avatar` — Authenticated, own account or admin. Accepts multipart. Calls the images service internally, updates `user.avatarId`. Deletes old avatar from S3 if it existed.
- `POST /api/v1/users/invite` — Admin only. Create an `EmailInvite` record, queue an `InviteEmail` job. Expiry: 7 days. Check if the email is already registered.

---

### Task 12 — Implement subjects module

**Goal:** Top-level organizational containers. Users can browse them; only admins/editors can create or modify them.

**Files:** `src/modules/subjects/subjects.routes.ts`, `subjects.service.ts`, `subjects.schema.ts`.

**Endpoints:**
- `GET /api/v1/subjects` — Public (no auth required). List non-deleted subjects. Filter by `visibility`. Pagination. Include `_count.projects`.
- `GET /api/v1/subjects/:slug` — Public. Return subject + nested projects (non-deleted, with `_count.sections`).
- `POST /api/v1/subjects` — Auth required, role `EDITOR` or `ADMIN`. Body: `name`, `description?`, `visibility?`. Auto-generate `slug` from name. Check uniqueness.
- `PATCH /api/v1/subjects/:slug` — Auth, own subject or admin. Update `name`, `description`, `visibility`, `imageId`.
- `DELETE /api/v1/subjects/:slug` — Admin only. Soft-delete: set `deletedAt = now`. Do not cascade yet (allow restore).

**Soft-delete filtering:** All list/get queries must include `WHERE deletedAt IS NULL` by default. Add an `?includeDeleted=true` query param for admin endpoints.

---

### Task 13 — Implement projects module

**Goal:** Projects group sections and pages under a subject. They support cover images, tags, comments, favorites, and views.

**Files:** `src/modules/projects/projects.routes.ts`, `projects.service.ts`, `projects.schema.ts`.

**Endpoints:**
- `GET /api/v1/subjects/:subjectSlug/projects` — List non-deleted projects for a subject. Include `_count.sections`, `_count.pages`. Paginated.
- `GET /api/v1/projects/:slug` — Return project with sections (non-deleted, ordered by `position`), tags, and `_count.favorites`.
- `POST /api/v1/projects` — Auth, editor+. Body: `name`, `subjectId`, `description?`, `visibility?`. Auto-generate slug. Check name uniqueness.
- `PATCH /api/v1/projects/:slug` — Auth, owner or admin. Update name, description, visibility, imageId.
- `DELETE /api/v1/projects/:slug` — Admin. Soft-delete.
- `GET /api/v1/projects/:slug/activity` — Paginated activity log for this project and all its children.

**On every GET** of a project by an authenticated user, upsert a `View` record (increment `count`, update `lastSeenAt`).

---

### Task 14 — Implement sections module

**Goal:** Ordered containers of pages within a project. Position can be reordered by drag-and-drop on the frontend.

**Files:** `src/modules/sections/sections.routes.ts`, `sections.service.ts`, `sections.schema.ts`.

**Endpoints:**
- `GET /api/v1/projects/:projectSlug/sections` — Non-deleted sections ordered by `position`. Include `_count.pages`.
- `GET /api/v1/sections/:slug` — Section with pages (non-deleted, ordered by position, excluding `content` for performance — only title, slug, isDraft).
- `POST /api/v1/sections` — Auth, editor+. Body: `projectId`, `title`, `description?`, `visibility?`. `position` defaults to `max(position) + 1`.
- `PATCH /api/v1/sections/:slug` — Auth, own or admin. Update title, description, visibility.
- `PATCH /api/v1/sections/:slug/position` — Auth, editor+. Body: `{ positions: [{ id, position }] }`. Batch-update positions for all sections in a project (used by drag-and-drop reorder).
- `DELETE /api/v1/sections/:slug` — Admin. Soft-delete.

---

### Task 15 — Implement pages module

**Goal:** The core content unit. Every save creates a revision snapshot. Draft/publish workflow. Full-text search.

**Files:** `src/modules/pages/pages.routes.ts`, `pages.service.ts`, `pages.schema.ts`.

**Endpoints:**
- `GET /api/v1/sections/:sectionSlug/pages` — Paginated page list for a section. Filter by `isDraft`, `visibility`. Return pages without `content` (index view).
- `GET /api/v1/pages/:slug` — Full page with `content`, `createdBy`, `updatedBy`, tags, `_count.comments`, `_count.favorites`. Upsert a `View` record.
- `POST /api/v1/pages` — Auth, editor+. Body: `title`, `content`, `sectionId`, `isDraft?`. Auto-generate slug from title. Set `currentRevision: 0`. Do NOT create a revision on initial creation.
- `PUT /api/v1/pages/:slug` — Auth. Replace full page content. On every successful save: create a `Revision` record with the **previous** content and increment `currentRevision`. Update `updatedById` and `updatedAt`.
- `PATCH /api/v1/pages/:slug` — Auth. Partial update (e.g., toggle `isDraft`, update `visibility`, change `ownedById`). Only create a revision if `content` or `title` changes.
- `DELETE /api/v1/pages/:slug` — Admin. Soft-delete.
- `GET /api/v1/search?q=query` — Full-text search using the raw `tsvector` query. Returns paginated list of matching pages with `rank` score. Requires auth.

**Revision snapshot logic** (inside `pages.service.ts`):
```typescript
async function updatePage(slug, dto, userId) {
  const existing = await prisma.page.findUnique({ where: { slug } })
  
  const contentChanged = dto.content !== undefined && dto.content !== existing.content
  const titleChanged   = dto.title   !== undefined && dto.title   !== existing.title

  if (contentChanged || titleChanged) {
    await prisma.revision.create({
      data: {
        pageId:         existing.id,
        projectId:      existing.projectId,
        sectionId:      existing.sectionId,
        createdById:    userId,
        title:          existing.title,
        content:        existing.content,
        slug:           existing.slug,
        revisionNumber: existing.currentRevision,
      }
    })
  }

  return prisma.page.update({
    where: { slug },
    data: {
      ...dto,
      updatedById: userId,
      currentRevision: contentChanged || titleChanged
        ? existing.currentRevision + 1
        : existing.currentRevision,
    }
  })
}
```

---

### Task 16 — Implement revisions module

**Goal:** Full version history with ability to preview any past revision and restore it.

**Files:** `src/modules/revisions/revisions.routes.ts`, `revisions.service.ts`.

**Endpoints:**
- `GET /api/v1/pages/:pageSlug/revisions` — Paginated list of revisions for a page. Return `id`, `revisionNumber`, `title`, `summary`, `createdBy.name`, `createdAt`. Do NOT return `content` here (too heavy for a list).
- `GET /api/v1/pages/:pageSlug/revisions/:revisionNumber` — Full revision including `content`. Used for diff/preview view.
- `POST /api/v1/pages/:pageSlug/revisions/:revisionNumber/restore` — Auth, editor+. Take the revision's `title` and `content`, run the `updatePage` service function (which will snapshot the current version first), effectively making the old revision the new current content. Return the updated page.

---

### Task 17 — Implement comments module

**Goal:** Threaded comments (one level of nesting) on pages, projects, and sections.

**Files:** `src/modules/comments/comments.routes.ts`, `comments.service.ts`, `comments.schema.ts`.

**Endpoints:**
- `GET /api/v1/pages/:pageSlug/comments` — Root-level comments with their `replies` (one level deep). Include `user.name`, `user.avatar`. Paginated.
- `GET /api/v1/projects/:projectSlug/comments` — Same for projects.
- `GET /api/v1/sections/:sectionSlug/comments` — Same for sections.
- `POST /api/v1/comments` — Auth. Body: `body`, `pageId? | projectId? | sectionId?`, `parentId?`. Validate that exactly one of the polymorphic targets is set. If `parentId` is set, validate it belongs to the same resource. Queue an `ActivityType.COMMENTED` event.
- `PATCH /api/v1/comments/:id` — Auth, own comment only. Body: `{ body }`. Add `updatedAt` tracking.
- `DELETE /api/v1/comments/:id` — Auth. Own comment or admin. Hard-delete. Cascade will delete replies.

---

### Task 18 — Implement tags, favorites, views, activities modules

**Goal:** Supporting features that enrich the content experience — tagging, bookmarking, read-tracking, and an audit trail.

**Tags** (`src/modules/tags/`):
- `POST /api/v1/tags` — Auth, editor+. Body: `{ name, pageId? | projectId? | sectionId? }`. Enforce max 10 tags per resource. Normalize name to lowercase.
- `DELETE /api/v1/tags/:id` — Auth, tag creator or admin.
- `GET /api/v1/tags?name=ts` — Search tags by prefix for autocomplete (used in the editor).

**Favorites** (`src/modules/favorites/`):
- `POST /api/v1/favorites` — Auth. Body: `{ pageId? | projectId? | sectionId? }`. Upsert using the `@@unique` constraints. If already favorited, delete it (toggle behavior). Return `{ favorited: boolean }`.
- `GET /api/v1/favorites` — Auth. Return current user's favorites with resource details. Paginated.

**Views** (`src/modules/views/`):
- No dedicated routes — views are upserted internally from the pages and projects `GET` handlers. But expose:
- `GET /api/v1/pages/:pageSlug/views` — Return total view count and unique viewer count.

**Activities** (`src/modules/activities/`):
- `GET /api/v1/activities` — Auth, admin. Filter by `userId`, `resourceType`, `type`, date range. Paginated. Include `user.name`, resource title.
- `GET /api/v1/users/:id/activities` — Auth. Own activities or admin. The personal audit trail.
- Internal `logActivity(userId, type, resourceType, resourceId, details?, ip?)` helper function called from other services (not a route).

---

### Task 19 — Implement images module

**Goal:** All image uploads are processed, optimized, and stored in S3. No base64 is ever saved to the database.

**Files:** `src/modules/images/images.routes.ts`, `images.service.ts`.

**Endpoints:**
- `POST /api/v1/images` — Auth. Accepts `multipart/form-data` with fields: `file` (the binary) and `type` (`COVER | AVATAR | INLINE`). Processing pipeline:
  1. Receive buffer via `@fastify/multipart`.
  2. Validate MIME type (allow `image/jpeg`, `image/png`, `image/webp`, `image/gif`).
  3. Use `sharp` to: resize to max 2000px width (maintain aspect ratio), convert to `webp`, set quality 80.
  4. Generate S3 key: `uploads/{userId}/{year}/{month}/{nanoid(10)}.webp`.
  5. Upload buffer to S3 via `storage.uploadFile()`.
  6. Create `Image` record in DB with `name`, `url` (full public URL), `path` (S3 key), `type`, `createdById`.
  7. Return `{ id, url }`.
- `DELETE /api/v1/images/:id` — Auth. Own image or admin. Delete from S3 via `storage.deleteFile(path)`, then delete DB record.

**For AVATAR type** — additional step: create a 200×200px cropped square thumbnail as the avatar variant.

---

### Task 20 — Implement settings module

**Goal:** Admins can configure global application behavior without redeploying.

**Files:** `src/modules/settings/settings.routes.ts`, `settings.service.ts`.

**Settings keys to define (as constants):**
- `ALLOW_SELF_REGISTRATION` — `"true" | "false"`. Checked by the register endpoint.
- `DEFAULT_USER_ROLE` — `"EDITOR" | "GUEST"`. Used when creating users via self-registration.
- `SITE_NAME` — Display name shown in the UI and emails.
- `SITE_LOGO_IMAGE_ID` — Image ID of the site logo.

**Endpoints:**
- `GET /api/v1/settings` — Public (some settings are needed before login, e.g., `ALLOW_SELF_REGISTRATION`). Return all as `{ [key]: value }`.
- `PUT /api/v1/settings/:key` — Admin only. Body: `{ value: string }`. Validate the key is in the allowed list. After update, optionally invalidate a Redis cache key `settings:all` (cache settings for 60s to reduce DB queries).

---

### Task 21 — Implement BullMQ workers

**Goal:** All side effects (email, async image tasks) run outside the request lifecycle, making API responses fast and resilient.

**Files:**

- `src/workers/email.worker.ts`:
  - Create a BullMQ `Worker` consuming jobs from `emailQueue`.
  - Switch on job `name`: `'send-email'`.
  - Job data shape: `{ to: string, template: 'welcome' | 'verify' | 'invite' | 'reset-password', data: Record<string, unknown> }`.
  - Import the appropriate React Email component based on `template`, call `render(component)` to get the HTML string, call `sendMail({ to, subject, html })`.
  - On failure, BullMQ will retry automatically — configure 3 retries with exponential backoff.

- `src/workers/image.worker.ts`:
  - Consume `imageQueue`.
  - Job `name: 'process-image'` — currently a placeholder for future async image processing (e.g., generating multiple sizes). For now just log.

**Worker registration:** In `server.ts`, import and start both workers after the Fastify server starts listening. Ensure workers connect to Redis using the same client config.

---

### Task 22 — Build React Email templates

**Goal:** Branded, responsive HTML email templates for all transactional emails.

**Directory:** `apps/api/src/emails/`

**Templates to create** (each is a `.tsx` file exporting a React component + a `subject` string):

- `WelcomeEmail.tsx` — props: `{ name, loginUrl }`. Content: welcome message, call-to-action button to log in.
- `VerifyEmailEmail.tsx` — props: `{ name, verifyUrl }`. Content: please verify your email, button with token URL, expiry notice (24h).
- `InviteEmail.tsx` — props: `{ name, inviterName, role, acceptUrl, expiresAt }`. Content: you've been invited by `{inviterName}` as a `{role}`, accept button, expiry date.
- `ResetPasswordEmail.tsx` — props: `{ name, resetUrl }`. Content: password reset requested, button, 1-hour expiry warning, "if you didn't request this, ignore this email".

**Base layout:** Create a `layouts/BaseLayout.tsx` with GiGaWiki branding (logo, footer with site name). All templates wrap their content in this layout.

**Usage in worker:**
```typescript
import { render } from '@react-email/render'
import { InviteEmail } from '../emails/InviteEmail'

const html = await render(<InviteEmail name={data.name} acceptUrl={data.acceptUrl} ... />)
```

---

### Task 23 — Write Prisma seed script

**Goal:** A freshly cloned repo can be seeded to a usable state in one command.

**File:** `apps/api/prisma/seed.ts`

**Data to seed:**
1. **Admin user** — name: `Admin`, email: `admin@gigawiki.local`, password: `Admin1234!` (hashed with bcrypt), role: `ADMIN`, `emailConfirmed: true`.
2. **Editor user** — name: `Editor`, email: `editor@gigawiki.local`, same password, role: `EDITOR`, `emailConfirmed: true`.
3. **Subject** — name: `Engineering`, slug: `engineering`, visibility: `PUBLIC`, owned by admin.
4. **Project** — name: `Backend Architecture`, slug: `backend-architecture`, under Engineering, visibility: `PUBLIC`.
5. **Section** — title: `Getting Started`, slug: `getting-started`, position: 0, under Backend Architecture.
6. **Page** — title: `Welcome to GiGaWiki`, slug: `welcome-to-gigawiki`, content: a Tiptap-compatible JSON string with a welcome heading and paragraph, under Getting Started, `isDraft: false`, `publishedAt: now`.
7. **Settings** — insert default settings: `ALLOW_SELF_REGISTRATION=true`, `DEFAULT_USER_ROLE=GUEST`, `SITE_NAME=GiGaWiki`.

**In `package.json`:**
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Run with: `pnpm prisma db seed`

---

## Phase 4 — Frontend (apps/web)

### Task 24 — Bootstrap apps/web — React + Vite + Tailwind + shadcn/ui

**Goal:** A running frontend dev server with Tailwind CSS and shadcn/ui ready to use.

**Steps:**
1. Scaffold with: `pnpm create vite apps/web --template react-ts`.
2. Install Tailwind: `pnpm add -D tailwindcss postcss autoprefixer` → `npx tailwindcss init -p`.
3. Configure `tailwind.config.ts` — set `content` to scan all `src/**/*.{ts,tsx}`.
4. Update `src/index.css` — add Tailwind `@base`, `@components`, `@utilities` directives. Add CSS variables for the shadcn color palette (copy from shadcn docs).
5. Install shadcn/ui: `npx shadcn-ui@latest init`. Choose: TypeScript, Default style, CSS variables, `src/components/ui` path.
6. Add core shadcn components upfront: `Button`, `Input`, `Label`, `Card`, `Dialog`, `DropdownMenu`, `Separator`, `Tooltip`, `Badge`, `Avatar`, `Skeleton`, `Textarea`, `Select`, `Switch`, `Table`.
7. Set up path aliases in `vite.config.ts` and `tsconfig.json`: `@` → `src/`, `@shared` → `../../packages/shared/src`.

**Verify:** `pnpm dev` starts on port 5173. Browser shows Vite + React default page with no console errors.

---

### Task 25 — Configure TanStack Router + TanStack Query + Axios client

**Goal:** Type-safe routing, automatic server state management, and a pre-configured HTTP client with JWT refresh.

**Files:**

- `src/api/client.ts` — create an `axios` instance with `baseURL: import.meta.env.VITE_API_URL`. Add a **request interceptor** that attaches the access token from the auth store (`Authorization: Bearer {token}`). Add a **response interceptor** that on 401:
  1. Calls `POST /auth/refresh` (no Authorization header — relies on cookie).
  2. On success: updates the access token in the auth store, retries the original request.
  3. On failure (refresh also returns 401): clears the auth store, redirects to `/login`.
  Use a flag `isRefreshing` and a queue of pending requests to prevent concurrent refresh calls.

- `src/router.tsx` — create the TanStack Router instance. Configure route tree. Add a `beforeLoad` guard on all authenticated routes that checks the auth store. If not logged in, redirect to `/login` with `redirect` search param.

- `src/main.tsx` — wrap the app with `<QueryClientProvider>`, `<RouterProvider>`, and `<Toaster>` (react-hot-toast).

- `vite.config.ts` — add `VITE_API_URL` env var support.

---

### Task 26 — Create Zustand stores

**Goal:** Minimal global state that persists the current user's session and app-wide settings.

**Files:**

- `src/stores/auth.store.ts`:
  ```typescript
  interface AuthState {
    user: User | null
    accessToken: string | null
    isLoading: boolean
    setAuth: (user: User, accessToken: string) => void
    clearAuth: () => void
    initAuth: () => Promise<void>  // calls GET /auth/me on app mount
  }
  ```
  The `accessToken` is stored in memory only (not `localStorage`) for XSS protection. The `initAuth` function is called once in `App.tsx` on mount — it hits `GET /auth/me` (cookie is sent automatically) to restore the session after a page refresh.

- `src/stores/settings.store.ts`:
  ```typescript
  interface SettingsState {
    settings: Record<string, string>
    fetchSettings: () => Promise<void>
    getSetting: (key: string) => string | undefined
  }
  ```
  Fetches settings from `GET /api/v1/settings` on app mount. Cached in memory. Provides `getSetting('ALLOW_SELF_REGISTRATION')` etc.

---

### Task 27 — Build app layout components

**Goal:** The persistent chrome (sidebar + topbar) that wraps every authenticated page.

**Files in `src/components/layout/`:**

- `AppShell.tsx` — flex layout: fixed-width `<Sidebar>` on the left, scrollable main area on the right with `<Topbar>` at the top. Responsive: sidebar collapses to a drawer on mobile. Renders `<Outlet />` for child routes.

- `Sidebar.tsx`:
  - Fetches subjects via TanStack Query.
  - Renders an accordion tree: `Subject → Project → Section`. Expanding a subject loads its projects lazily.
  - Active route is highlighted.
  - "New Page" quick-action button at the bottom.
  - Collapsible toggle.

- `Topbar.tsx`:
  - Left: breadcrumb showing current `Subject > Project > Section > Page`.
  - Center: search input (opens a command palette / modal on focus with Cmd+K shortcut).
  - Right: user avatar dropdown (Profile, Settings, Logout).

- `SearchModal.tsx` — full-screen overlay. Debounced input that calls `GET /api/v1/search?q=`. Shows results grouped by project. Keyboard navigation (arrow keys, enter to navigate).

---

### Task 28 — Build auth pages

**Goal:** Complete authentication UI with form validation, error messages, and loading states.

**Files in `src/pages/auth/`:**

- `LoginPage.tsx` — email + password form. On submit calls `POST /auth/login` via mutation. On success calls `setAuth(user, accessToken)`, redirects to `redirect` search param or `/`. Show error toast on failure.
- `RegisterPage.tsx` — name, email, password, confirm password. Only shown if `getSetting('ALLOW_SELF_REGISTRATION') === 'true'`. Redirect to login after success with success toast.
- `ForgotPasswordPage.tsx` — email only. Shows success message after submit regardless of whether email exists.
- `ResetPasswordPage.tsx` — reads `token` from URL search param. New password + confirm. Redirects to login on success.
- `VerifyEmailPage.tsx` — reads `token` from URL. Calls the verify endpoint on mount. Shows success or error state.
- `AcceptInvitePage.tsx` — reads `token` from URL. Shows a form for `name` and `password`. On success logs the user in and redirects to dashboard.

**Shared:** Create a `src/components/auth/AuthLayout.tsx` — centered card with GiGaWiki logo, used by all auth pages.

---

### Task 29 — Build Dashboard page

**Goal:** A useful home screen that orients the user to recent activity and their favorite content.

**File:** `src/pages/dashboard.tsx`

**Sections to build:**

1. **Recent Activity feed** — calls `GET /api/v1/users/me/activities?perPage=10`. Each item shows avatar, action description ("Alice updated **Welcome to GiGaWiki**"), and relative time (`dayjs().from(activity.createdAt)`).
2. **Favorites** — calls `GET /api/v1/favorites?perPage=6`. Shows cards for favorited pages/projects with a star icon. Empty state: "No favorites yet — star a page to see it here."
3. **Recently visited pages** — reads from `GET /api/v1/views?userId=me&perPage=6` (sorted by `lastSeenAt`).
4. **Quick stats** (admin only) — total users, total pages, total subjects.

Use `Skeleton` components during loading. Use TanStack Query's `useQueries` to fetch all sections in parallel.

---

### Task 30 — Build Subjects, Projects, Sections pages

**Goal:** Full CRUD UI for the organizational hierarchy with list views, detail views, and create/edit dialogs.

**Subjects (`src/pages/subjects/`):**
- `SubjectsPage.tsx` — grid of subject cards. Each card: cover image, name, description, project count badge. "New Subject" button (editor+). Click → `SubjectDetailPage`.
- `SubjectDetailPage.tsx` — header with cover image, description, edit button. Below: grid of project cards. "New Project" button.
- `SubjectFormDialog.tsx` — modal for create/edit. Fields: name, description, visibility toggle, cover image upload (drag-and-drop using `@fastify/multipart` endpoint).

**Projects (`src/pages/projects/`):**
- `ProjectDetailPage.tsx` — project header, section list in the sidebar, page list in main area. "New Section" and "New Page" quick-actions.
- `ProjectFormDialog.tsx` — name, description, subject selector, visibility, cover image.

**Sections (`src/pages/sections/`):**
- Sections don't have their own dedicated page — they appear inline in `ProjectDetailPage` as a collapsible list.
- `SectionFormDialog.tsx` — title, description, visibility.
- Drag-and-drop reorder using `@dnd-kit/core` — calls `PATCH /sections/:slug/position` on drop.

---

### Task 31 — Build Page view and Tiptap rich text editor

**Goal:** A clean reading and editing experience. The editor feels native and fast.

**Files in `src/components/editor/`:**

- `Editor.tsx` — main Tiptap component. Props: `content: string`, `onChange: (html: string) => void`, `editable: boolean`. Configure extensions:
  - `StarterKit` — headings H1–H4, bold, italic, strike, code, blockquote, horizontal rule, ordered/unordered lists, code block with syntax highlighting.
  - `Image.configure({ uploadFn })` — the `uploadFn` is a function that receives a `File`, calls `POST /api/v1/images` with `type=INLINE`, and returns the URL. Tiptap replaces the blob URL with the real URL.
  - `Link.configure({ openOnClick: false })`.
  - `Table` with `TableRow`, `TableHeader`, `TableCell`.
  - `Mention.configure({ suggestion })` — suggestion queries `GET /api/v1/users?search=` and shows a floating popup with user names.
  - `Placeholder.configure({ placeholder: 'Start writing...' })`.
- `EditorToolbar.tsx` — floating bubble menu + fixed toolbar with formatting buttons. Use `lucide-react` icons.
- `EditorMenuBar.tsx` — format dropdown (headings), bold, italic, link, image insert, table insert, code block.

**Page view (`src/pages/pages/`):**
- `PageViewPage.tsx` — read-only Tiptap rendering (`editable: false`). Shows page title, metadata (author, updated date, tags), Edit button (editor+), favorite toggle button. Below the content: Comments section, Revisions panel (collapsible sidebar drawer).
- `PageEditPage.tsx` — full editor. Auto-save draft every 30 seconds (debounced). Save button calls `PUT /api/v1/pages/:slug`. Show "Unsaved changes" indicator.

---

### Task 32 — Build Revisions panel

**Goal:** Users can browse the full history of a page, preview any past version, and restore it.

**Files in `src/components/revisions/`:**

- `RevisionsDrawer.tsx` — right-side drawer. Triggered by "History" button in the page toolbar. Fetches `GET /api/v1/pages/:slug/revisions`.
- `RevisionList.tsx` — scrollable list. Each item: revision number, editor's avatar + name, relative timestamp, summary (if provided). Current revision highlighted.
- `RevisionPreview.tsx` — when a revision is clicked, loads the full content from `GET /revisions/:revisionNumber` and renders it in a read-only Tiptap instance.
- `RestoreButton.tsx` — "Restore this version" button. Shows a confirmation dialog before calling `POST /revisions/:revisionNumber/restore`. On success, closes drawer, shows success toast, and invalidates the page query.

---

### Task 33 — Build Comments component

**Goal:** Threaded discussion attached to any content resource, with real-time-feeling UX (optimistic updates).

**Files in `src/components/comments/`:**

- `CommentSection.tsx` — top-level. Shows total comment count, the `CommentForm` for new comments, and the `CommentList`.
- `CommentList.tsx` — root comments only (no `parentId`). Each comment renders a `CommentItem`.
- `CommentItem.tsx` — author avatar, name, timestamp, body (rendered as Markdown-lite). Actions: Reply (opens inline `CommentForm`), Edit (own comments), Delete (own or admin). Shows `replies` below when expanded.
- `CommentForm.tsx` — textarea with submit. Use **optimistic updates** via TanStack Query's `useMutation`: add the new comment to the cache immediately before the API call resolves.

---

### Task 34 — Build Settings pages

**Goal:** Users can manage their profile; admins can manage the whole platform.

**Route structure:** `/settings/*`

**Files in `src/pages/settings/`:**

- `SettingsLayout.tsx` — left nav with links: Profile, Password, Appearance | (admin only) Users, Invites, App Settings.
- `ProfilePage.tsx` — name, email (with re-verification note), avatar upload (drag-and-drop, preview before submit). Calls `PATCH /users/me`.
- `PasswordPage.tsx` — current password, new password, confirm. Calls `PATCH /users/me` with `{ currentPassword, newPassword }`.
- `UsersPage.tsx` — (admin) TanStack Table with columns: avatar, name, email, role (editable inline dropdown), joined date, actions (delete). Pagination. Search input.
- `InvitesPage.tsx` — (admin) list of pending invites (email, role, sent by, expiry). "New Invite" form: email, name, role selector. Calls `POST /users/invite`. Resend/cancel actions.
- `AppSettingsPage.tsx` — (admin) form for all `settings` key-value pairs: self-registration toggle (Switch), default role (Select), site name (Input).

---

### Task 35 — Write TanStack Query hooks for all API modules

**Goal:** All API calls go through typed, cached, auto-refetching TanStack Query hooks — no raw axios calls in page components.

**Files in `src/api/`:**

- `auth.ts` — `useMe()`, `useLogin()`, `useLogout()`, `useRegister()`, `useForgotPassword()`, `useResetPassword()`.
- `subjects.ts` — `useSubjects(params?)`, `useSubject(slug)`, `useCreateSubject()`, `useUpdateSubject()`, `useDeleteSubject()`.
- `projects.ts` — `useProjects(subjectSlug, params?)`, `useProject(slug)`, `useCreateProject()`, `useUpdateProject()`, `useDeleteProject()`.
- `sections.ts` — `useSections(projectSlug)`, `useSection(slug)`, `useCreateSection()`, `useUpdateSection()`, `useReorderSections()`, `useDeleteSection()`.
- `pages.ts` — `usePages(sectionSlug, params?)`, `usePage(slug)`, `useCreatePage()`, `useUpdatePage()`, `useDeletePage()`, `useSearch(query)`.
- `revisions.ts` — `useRevisions(pageSlug)`, `useRevision(pageSlug, revisionNumber)`, `useRestoreRevision()`.
- `comments.ts` — `useComments(resource, id)`, `useCreateComment()`, `useUpdateComment()`, `useDeleteComment()`.
- `tags.ts` — `useCreateTag()`, `useDeleteTag()`, `useTagSearch(prefix)`.
- `favorites.ts` — `useFavorites()`, `useToggleFavorite()`.
- `images.ts` — `useUploadImage()`.
- `users.ts` — `useUsers(params?)`, `useUser(id)`, `useUpdateUser()`, `useDeleteUser()`, `useInviteUser()`.
- `settings.ts` — `useSettings()`, `useUpdateSetting()`.

**Query key conventions:** Use arrays for cache keys: `['subjects']`, `['subject', slug]`, `['pages', 'section', sectionSlug]`, `['page', slug]`. This enables precise `queryClient.invalidateQueries()` calls after mutations.

---

## Phase 5 — Tests, CI/CD & GitHub

### Task 36 — Write backend tests

**Goal:** Critical paths are covered by automated tests that run in CI against a real database.

**Test file structure** (mirror `src/` under `src/__tests__/`):

- `auth.test.ts`:
  - `POST /auth/login` — 200 with tokens on valid creds, 401 on wrong password, 401 on unknown email.
  - `POST /auth/refresh` — 200 with new token when valid cookie, 401 when token expired or revoked.
  - `POST /auth/logout` — 204, token record marked revoked.
  - `POST /auth/register` — 201 creates user, 409 if email exists, 400 if `ALLOW_SELF_REGISTRATION=false`.
  - `POST /auth/forgot-password` — always 200 (no enumeration).
  - `GET /auth/me` — 200 with user data, 401 without token.

- `pages.test.ts`:
  - Creating a page → no revision exists yet.
  - Updating content → revision `0` is created, `currentRevision` increments to `1`.
  - Updating again → revision `1` is created.
  - Restoring revision `0` → creates revision `2`, content matches original.
  - Soft-delete → page not returned in list, but still in DB.

- `search.test.ts`:
  - Insert page with `title='TypeScript guide'`, search for `typescript` → page is returned.
  - Search for `python` → no results.

**Test setup:** Create a `vitest.config.ts` in `apps/api`. Use a separate `DATABASE_URL` pointing to a `gigawiki_test` database. In `beforeAll`, run `prisma migrate deploy`. In `afterEach`, truncate all tables. Use Fastify's `app.inject()` for HTTP calls — no real network.

---

### Task 37 — Write frontend component tests

**Goal:** Key UI components render correctly and handle user interactions as expected.

**Test file locations** mirror `src/` under `src/__tests__/`:

- `LoginPage.test.tsx`:
  - Renders email and password inputs.
  - Shows validation errors on empty submit.
  - Calls the login mutation with correct values.
  - Shows error message from API on 401.
  - Redirects to dashboard on success.

- `Editor.test.tsx`:
  - Renders with initial content.
  - Calls `onChange` when text is typed.
  - Renders in read-only mode when `editable=false` (no toolbar visible).

- `CommentSection.test.tsx`:
  - Renders list of comments.
  - New comment form submits and optimistically adds comment.
  - Delete button only shown for own comments.

**Test setup:** Use `vitest` + `@testing-library/react` + `jsdom`. Mock `src/api/client.ts` with `vi.mock`. Use `renderWithProviders()` helper that wraps in QueryClientProvider + RouterProvider.

---

### Task 38 — Write Dockerfile for the API

**Goal:** The API can be built into a lean Docker image suitable for deployment.

**File:** `apps/api/Dockerfile`

**Multi-stage build:**

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter api build          # tsc → dist/
RUN pnpm prisma generate --schema apps/api/prisma/schema.prisma

# Stage 2: Production
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

**Also create:**
- `.dockerignore` — exclude `node_modules`, `.env`, `coverage`, `*.test.ts`, `.turbo`.
- A `docker-compose.override.yml` for production-like local testing that includes the API service.

**Verify:** `docker build -f apps/api/Dockerfile .` completes successfully and the image is under 300 MB.

---

### Task 39 — Set up GitHub Actions CI pipeline

**Goal:** Every pull request is automatically linted, type-checked, tested, and built. A red CI prevents merging broken code.

**File:** `.github/workflows/ci.yml`

**Triggers:** `on: [push, pull_request]` for branches `main` and `develop`.

**Jobs:**

1. **`quality`** — runs on `ubuntu-latest`:
   - `pnpm install --frozen-lockfile`
   - `pnpm turbo typecheck` (tsc --noEmit across all packages)
   - `pnpm turbo lint` (eslint)

2. **`test-api`** — runs on `ubuntu-latest` with service containers:
   ```yaml
   services:
     postgres:
       image: postgres:16-alpine
       env: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: gigawiki_test }
       options: --health-cmd "pg_isready" --health-interval 5s
     redis:
       image: redis:7-alpine
       options: --health-cmd "redis-cli ping"
   ```
   - Set env vars (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, etc.).
   - `pnpm prisma migrate deploy`
   - `pnpm turbo test --filter=api`

3. **`test-web`** — runs on `ubuntu-latest`:
   - `pnpm turbo test --filter=web`

4. **`build`** — depends on `quality`, `test-api`, `test-web`:
   - `pnpm turbo build`
   - Upload `apps/web/dist` as an artifact.

**Caching:** Cache `~/.pnpm-store` and `.turbo` between runs using `actions/cache` keyed on `pnpm-lock.yaml` hash.

---

### Task 40 — Initialize GitHub repository and push initial commit

**Goal:** The project is on GitHub with a proper branch strategy and protected main branch.

**Steps:**

1. Create a new **private** GitHub repository named `gigawiki-v2` under the target organization or user account.
2. Initialize git locally if not done: `git init && git add . && git commit -m "feat: initial monorepo scaffold"`.
3. Add remote: `git remote add origin git@github.com:{org}/gigawiki-v2.git`.
4. Push: `git push -u origin main`.
5. In GitHub Settings → Branches → Branch protection rules for `main`:
   - Require pull request before merging (1 approval).
   - Require status checks to pass (`quality`, `test-api`, `test-web`, `build`).
   - Do not allow bypassing the above settings.
6. Create a `develop` branch from `main`. This is where feature branches are merged via PR. `main` only receives merges from `develop` (tagged releases).
7. Create `CONTRIBUTING.md` with:
   - Branch naming: `feat/`, `fix/`, `chore/` prefix.
   - Commit message convention (conventional commits).
   - The five first-time setup commands.
   - How to run tests locally.
   - PR checklist (tests pass, no TypeScript errors, migration added if schema changed).

---

*End of task list. Total: 40 tasks across 5 phases.*
