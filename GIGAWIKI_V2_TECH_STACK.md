# GiGaWiki V2 — Tech Stack & Prisma Schema

> Complete technology decisions, rationale, project structure, and database schema
> for rebuilding GiGaWiki in Node.js + React + TypeScript.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Backend Stack](#2-backend-stack)
3. [Frontend Stack](#3-frontend-stack)
4. [Infrastructure & DevOps](#4-infrastructure--devops)
5. [Monorepo Structure](#5-monorepo-structure)
6. [Package Decisions — Alternatives Considered](#6-package-decisions--alternatives-considered)
7. [Prisma Schema](#7-prisma-schema)
8. [API Design Conventions](#8-api-design-conventions)
9. [Authentication Flow](#9-authentication-flow)
10. [File Storage Strategy](#10-file-storage-strategy)
11. [Email Strategy](#11-email-strategy)
12. [Search Strategy](#12-search-strategy)
13. [Real-time Strategy](#13-real-time-strategy)
14. [Environment Variables](#14-environment-variables)
15. [Development Workflow](#15-development-workflow)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                           │
│   React 18 + TypeScript + Vite                                  │
│   TanStack Query · TanStack Router · Tiptap · Tailwind CSS      │
└─────────────────────────────┬───────────────────────────────────┘
                              │  HTTPS / REST + WebSocket
┌─────────────────────────────▼───────────────────────────────────┐
│                          API Layer                              │
│   Fastify + TypeScript                                          │
│   Zod validation · JWT auth · Rate limiting · CORS             │
└──────┬──────────────┬────────────────┬────────────────┬─────────┘
       │              │                │                │
┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  PostgreSQL │ │   Redis     │ │  S3-compat  │ │  SMTP/SES   │
│  (Prisma)   │ │  (cache +   │ │  (files +   │ │  (email)    │
│             │ │   queues)   │ │   images)   │ │             │
└─────────────┘ └────────────┘ └─────────────┘ └─────────────┘
```

**Pattern:** API-first. The backend exposes a versioned REST API. The frontend is a completely separate SPA that consumes it. No server-side rendering required for this type of internal wiki.

---

## 2. Backend Stack

### Core

| Package | Version | Purpose |
|---|---|---|
| **Node.js** | 22 LTS | Runtime |
| **TypeScript** | 5.x | Type safety |
| **Fastify** | 5.x | HTTP server (2x faster than Express, built-in schema validation) |
| **Prisma** | 6.x | ORM + migrations + type-safe query builder |
| **PostgreSQL** | 16 | Primary database |
| **Redis** | 7 | Session cache, job queues, rate limiting |

### Authentication & Security

| Package | Purpose |
|---|---|
| `@fastify/jwt` | JWT signing and verification |
| `@fastify/cookie` | HttpOnly cookie for refresh token |
| `bcryptjs` | Password hashing |
| `@fastify/rate-limit` | Rate limiting per IP/user |
| `@fastify/cors` | CORS policy |
| `@fastify/helmet` | Security headers |
| `zod` | Request/response validation and schema inference |

### File Handling

| Package | Purpose |
|---|---|
| `@fastify/multipart` | Multipart form data / file uploads |
| `@aws-sdk/client-s3` | S3-compatible storage (AWS, Cloudflare R2, MinIO) |
| `sharp` | Image resizing and optimization before storage |
| `@aws-sdk/s3-request-presigner` | Signed URLs for private file access |

### Email & Queues

| Package | Purpose |
|---|---|
| `bullmq` | Job queue backed by Redis |
| `nodemailer` | SMTP email transport |
| `@react-email/render` | Render React components to HTML email |

### PDF & Export

| Package | Purpose |
|---|---|
| `puppeteer` | Headless Chrome for high-fidelity PDF generation |

### Utilities

| Package | Purpose |
|---|---|
| `slugify` | Generate URL-safe slugs |
| `dayjs` | Date formatting and relative time |
| `nanoid` | Short unique IDs where needed |
| `pino` | Structured logging (built into Fastify) |

---

## 3. Frontend Stack

### Core

| Package | Version | Purpose |
|---|---|---|
| **React** | 18.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Vite** | 6.x | Build tool and dev server |

### Routing & Data Fetching

| Package | Purpose |
|---|---|
| `@tanstack/react-router` | Type-safe file-based routing with search params |
| `@tanstack/react-query` | Server state, caching, refetching, mutations |
| `axios` | HTTP client (configured with interceptors for JWT refresh) |

### UI & Styling

| Package | Purpose |
|---|---|
| `tailwindcss` | Utility-first CSS |
| `@radix-ui/react-*` | Accessible unstyled UI primitives (dialogs, dropdowns, etc.) |
| `shadcn/ui` | Pre-built components on top of Radix + Tailwind |
| `lucide-react` | Icon set |
| `class-variance-authority` | Component variant management |
| `clsx` | Conditional class names |

### Rich Text Editor

| Package | Purpose |
|---|---|
| `@tiptap/react` | Headless rich text editor (ProseMirror-based) |
| `@tiptap/starter-kit` | Headings, bold, italic, lists, code blocks |
| `@tiptap/extension-image` | Image embedding |
| `@tiptap/extension-link` | Hyperlinks |
| `@tiptap/extension-table` | Table support |
| `@tiptap/extension-mention` | @mention support for users |
| `@tiptap/extension-placeholder` | Placeholder text |

> **Why Tiptap over CKEditor?** Tiptap is headless, fully controlled by your own UI, has a clean React API, and all extensions are TypeScript-native. CKEditor 5 is a black box with a complex theming system.

### Forms

| Package | Purpose |
|---|---|
| `react-hook-form` | Performant forms with minimal re-renders |
| `@hookform/resolvers` | Zod integration for form validation |
| `zod` | Shared validation schemas (same as backend) |

### Other

| Package | Purpose |
|---|---|
| `date-fns` | Date formatting |
| `react-hot-toast` | Toast notifications |
| `zustand` | Lightweight global state (auth user, settings) |
| `@tanstack/react-table` | Headless tables for admin lists |

---

## 4. Infrastructure & DevOps

### Local Development

| Tool | Purpose |
|---|---|
| `docker compose` | Run PostgreSQL + Redis + MinIO locally |
| `tsx` | Run TypeScript files directly (no compile step in dev) |
| `vite` | Frontend dev server with HMR |

### Testing

| Tool | Purpose |
|---|---|
| `vitest` | Unit + integration tests (works for both backend and frontend) |
| `@testing-library/react` | Component testing |
| `supertest` / Fastify `inject` | API endpoint testing |
| `prisma` + test database | Real DB integration tests |

### CI/CD

| Tool | Purpose |
|---|---|
| GitHub Actions | Lint, type-check, test, build on every PR |
| Docker | Containerize backend for deployment |
| Fly.io / Railway / Render | Backend hosting (cheap, Docker-native) |
| Vercel / Cloudflare Pages | Frontend hosting (static SPA) |
| Supabase / Neon | Managed PostgreSQL with branching |
| Upstash | Managed Redis (serverless-friendly) |

### Code Quality

| Tool | Purpose |
|---|---|
| `eslint` + `typescript-eslint` | Linting |
| `prettier` | Code formatting |
| `husky` + `lint-staged` | Pre-commit hooks |
| `@commitlint/cli` | Conventional commit messages |

---

## 5. Monorepo Structure

```
gigawiki-v2/
├── apps/
│   ├── api/                          # Fastify backend
│   │   ├── src/
│   │   │   ├── app.ts                # Fastify instance setup
│   │   │   ├── server.ts             # Entry point, listen
│   │   │   ├── config/
│   │   │   │   └── env.ts            # Zod-validated env vars
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts           # JWT plugin
│   │   │   │   ├── cors.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── multipart.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── auth.schema.ts
│   │   │   │   ├── users/
│   │   │   │   ├── subjects/
│   │   │   │   ├── projects/
│   │   │   │   ├── sections/
│   │   │   │   ├── pages/
│   │   │   │   ├── revisions/
│   │   │   │   ├── comments/
│   │   │   │   ├── tags/
│   │   │   │   ├── favorites/
│   │   │   │   ├── activities/
│   │   │   │   ├── images/
│   │   │   │   └── settings/
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts         # Prisma client singleton
│   │   │   │   ├── redis.ts          # Redis client
│   │   │   │   ├── storage.ts        # S3 client
│   │   │   │   ├── mailer.ts         # Nodemailer transport
│   │   │   │   ├── queue.ts          # BullMQ queues
│   │   │   │   └── slugify.ts        # Slug generation helper
│   │   │   └── workers/
│   │   │       ├── email.worker.ts
│   │   │       └── image.worker.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # React frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── app.tsx
│       │   ├── router.tsx
│       │   ├── api/                  # TanStack Query hooks + axios calls
│       │   │   ├── client.ts         # Axios instance
│       │   │   ├── auth.ts
│       │   │   ├── pages.ts
│       │   │   └── ...
│       │   ├── components/
│       │   │   ├── ui/               # shadcn components
│       │   │   ├── editor/           # Tiptap editor wrapper
│       │   │   ├── layout/           # AppShell, Sidebar, Topbar
│       │   │   ├── comments/
│       │   │   ├── revisions/
│       │   │   └── ...
│       │   ├── pages/                # Route components
│       │   │   ├── dashboard.tsx
│       │   │   ├── subjects/
│       │   │   ├── projects/
│       │   │   ├── sections/
│       │   │   ├── pages/
│       │   │   ├── settings/
│       │   │   └── auth/
│       │   ├── stores/               # Zustand stores
│       │   │   ├── auth.store.ts
│       │   │   └── settings.store.ts
│       │   └── lib/
│       │       ├── utils.ts
│       │       └── constants.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                       # Shared TypeScript types
│       ├── src/
│       │   ├── types/
│       │   │   ├── user.ts
│       │   │   ├── page.ts
│       │   │   ├── project.ts
│       │   │   └── ...
│       │   └── schemas/              # Shared Zod schemas
│       │       ├── auth.schema.ts
│       │       ├── page.schema.ts
│       │       └── ...
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml                # Local dev services
├── .env.example
├── package.json                      # Root workspace config
├── turbo.json                        # Turborepo pipeline
└── tsconfig.base.json
```

**Monorepo tool:** [Turborepo](https://turbo.build/) — handles build caching and parallel task execution across packages.

---

## 6. Package Decisions — Alternatives Considered

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| HTTP Framework | Fastify | Express, AdonisJS, Hono | Fastify: best TypeScript support, fastest, schema-first |
| ORM | Prisma | TypeORM, Drizzle, Sequelize | Prisma: best DX, auto-generated types, excellent migrations |
| Database | PostgreSQL | MySQL, SQLite | PostgreSQL: full-text search, JSONB, better Prisma support |
| Frontend router | TanStack Router | React Router, Next.js | TanStack Router: fully type-safe routes and search params |
| Auth | Custom JWT | NextAuth, Clerk, Auth0 | Full control, no vendor lock-in, simple for this use case |
| Editor | Tiptap | CKEditor 5, Quill, Slate | Tiptap: headless, TypeScript-native, extensible |
| State | Zustand | Redux, Jotai, Context | Zustand: minimal boilerplate for small global state |
| Styling | Tailwind + shadcn | MUI, Ant Design, Chakra | Tailwind: no runtime, fully customizable; shadcn: not a dependency |
| PDF | Puppeteer | pdfkit, jsPDF | Puppeteer: renders actual HTML → perfect fidelity |
| Queue | BullMQ | Agenda, pg-boss | BullMQ: Redis-backed, reliable, great TypeScript types |
| Monorepo | Turborepo | Nx, Lerna | Turborepo: simple config, excellent caching |

---

## 7. Prisma Schema

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum Role {
  ADMIN
  EDITOR
  GUEST
}

enum Visibility {
  PUBLIC
  PRIVATE
}

enum ActivityType {
  CREATED
  UPDATED
  DELETED
  COMMENTED
  REPLIED
  RESTORED
}

enum ResourceType {
  PAGE
  PROJECT
  SECTION
  SUBJECT
}

enum ImageType {
  COVER
  AVATAR
  INLINE
}

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────

model User {
  id                String    @id @default(cuid())
  name              String
  email             String    @unique
  emailVerifiedAt   DateTime?
  emailConfirmed    Boolean   @default(false)
  password          String
  slug              String    @unique
  role              Role      @default(GUEST)
  avatarId          String?
  avatar            Image?    @relation("UserAvatar", fields: [avatarId], references: [id])
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  subjects          Subject[]
  projects          Project[]
  pagesCreated      Page[]         @relation("PageCreatedBy")
  pagesUpdated      Page[]         @relation("PageUpdatedBy")
  pagesOwned        Page[]         @relation("PageOwnedBy")
  revisions         Revision[]
  comments          Comment[]
  tags              Tag[]
  favorites         Favorite[]
  views             View[]
  activities        Activity[]
  imagesUploaded    Image[]        @relation("ImageCreatedBy")
  imagesUpdated     Image[]        @relation("ImageUpdatedBy")
  invitesSent       EmailInvite[]  @relation("InviteSentBy")

  @@map("users")
}

// ─────────────────────────────────────────────
// IMAGE
// ─────────────────────────────────────────────

model Image {
  id          String    @id @default(cuid())
  name        String
  url         String
  path        String
  type        ImageType
  createdById String
  updatedById String?
  createdBy   User      @relation("ImageCreatedBy", fields: [createdById], references: [id])
  updatedBy   User?     @relation("ImageUpdatedBy", fields: [updatedById], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Back-relations
  userAvatars User[]    @relation("UserAvatar")
  subjects    Subject[]
  projects    Project[]

  @@map("images")
}

// ─────────────────────────────────────────────
// SUBJECT
// ─────────────────────────────────────────────

model Subject {
  id          String     @id @default(cuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String     @unique @db.VarChar(100)
  slug        String     @unique
  description String?
  imageId     String?
  image       Image?     @relation(fields: [imageId], references: [id], onDelete: SetNull)
  visibility  Visibility @default(PUBLIC)
  deletedAt   DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Relations
  projects    Project[]

  @@index([slug])
  @@index([userId])
  @@index([deletedAt])
  @@map("subjects")
}

// ─────────────────────────────────────────────
// PROJECT
// ─────────────────────────────────────────────

model Project {
  id          String     @id @default(cuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  subjectId   String
  subject     Subject    @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  name        String     @unique @db.VarChar(190)
  slug        String     @unique
  description String?
  imageId     String?
  image       Image?     @relation(fields: [imageId], references: [id], onDelete: SetNull)
  visibility  Visibility @default(PUBLIC)
  deletedAt   DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Relations
  sections    Section[]
  revisions   Revision[]
  tags        Tag[]       @relation("ProjectTags")
  comments    Comment[]   @relation("ProjectComments")
  favorites   Favorite[]  @relation("ProjectFavorites")
  views       View[]      @relation("ProjectViews")
  activities  Activity[]  @relation("ProjectActivities")

  @@index([slug])
  @@index([subjectId])
  @@index([userId])
  @@index([deletedAt])
  @@map("projects")
}

// ─────────────────────────────────────────────
// SECTION
// ─────────────────────────────────────────────

model Section {
  id          String     @id @default(cuid())
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String     @db.VarChar(190)
  slug        String     @unique
  description String?
  position    Int        @default(0)
  visibility  Visibility @default(PUBLIC)
  deletedAt   DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Relations
  pages       Page[]
  revisions   Revision[]
  tags        Tag[]       @relation("SectionTags")
  comments    Comment[]   @relation("SectionComments")
  favorites   Favorite[]  @relation("SectionFavorites")
  views       View[]      @relation("SectionViews")
  activities  Activity[]  @relation("SectionActivities")

  @@index([slug])
  @@index([projectId])
  @@index([deletedAt])
  @@map("sections")
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

model Page {
  id              String     @id @default(cuid())
  createdById     String
  createdBy       User       @relation("PageCreatedBy", fields: [createdById], references: [id])
  updatedById     String
  updatedBy       User       @relation("PageUpdatedBy", fields: [updatedById], references: [id])
  ownedById       String
  ownedBy         User       @relation("PageOwnedBy", fields: [ownedById], references: [id])
  projectId       String
  project         Project    @relation(fields: [projectId], references: [id])
  sectionId       String
  section         Section    @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  title           String     @unique
  slug            String     @unique
  content         String     @db.Text
  position        Int        @default(0)
  visibility      Visibility @default(PUBLIC)
  restricted      Boolean    @default(false)
  currentRevision Int        @default(0)
  isDraft         Boolean    @default(false)
  deletedAt       DateTime?
  publishedAt     DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  // Relations
  revisions       Revision[]
  tags            Tag[]       @relation("PageTags")
  comments        Comment[]   @relation("PageComments")
  favorites       Favorite[]  @relation("PageFavorites")
  views           View[]      @relation("PageViews")
  activities      Activity[]  @relation("PageActivities")

  @@index([slug])
  @@index([sectionId])
  @@index([projectId])
  @@index([deletedAt])
  @@index([isDraft])
  @@map("pages")
}

// ─────────────────────────────────────────────
// REVISION
// ─────────────────────────────────────────────

model Revision {
  id             String   @id @default(cuid())
  pageId         String
  page           Page     @relation(fields: [pageId], references: [id], onDelete: Cascade)
  projectId      String
  project        Project  @relation(fields: [projectId], references: [id])
  sectionId      String
  section        Section  @relation(fields: [sectionId], references: [id])
  createdById    String
  createdBy      User     @relation(fields: [createdById], references: [id])
  title          String
  content        String   @db.Text
  slug           String
  summary        String?
  revisionNumber Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([pageId])
  @@index([pageId, revisionNumber])
  @@map("revisions")
}

// ─────────────────────────────────────────────
// COMMENT
// ─────────────────────────────────────────────

model Comment {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  body      String   @db.Text
  parentId  String?
  parent    Comment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   Comment[] @relation("CommentReplies")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Polymorphic targets (only one will be set)
  pageId    String?
  page      Page?    @relation("PageComments", fields: [pageId], references: [id], onDelete: Cascade)
  projectId String?
  project   Project? @relation("ProjectComments", fields: [projectId], references: [id], onDelete: Cascade)
  sectionId String?
  section   Section? @relation("SectionComments", fields: [sectionId], references: [id], onDelete: Cascade)

  @@index([pageId])
  @@index([projectId])
  @@index([sectionId])
  @@index([parentId])
  @@map("comments")
}

// ─────────────────────────────────────────────
// TAG
// ─────────────────────────────────────────────

model Tag {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String   @db.VarChar(50)
  createdAt DateTime @default(now())

  // Polymorphic targets
  pageId    String?
  page      Page?    @relation("PageTags", fields: [pageId], references: [id], onDelete: Cascade)
  projectId String?
  project   Project? @relation("ProjectTags", fields: [projectId], references: [id], onDelete: Cascade)
  sectionId String?
  section   Section? @relation("SectionTags", fields: [sectionId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([name])
  @@index([pageId])
  @@index([projectId])
  @@index([sectionId])
  @@map("tags")
}

// ─────────────────────────────────────────────
// FAVORITE
// ─────────────────────────────────────────────

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  // Polymorphic targets
  pageId    String?
  page      Page?    @relation("PageFavorites", fields: [pageId], references: [id], onDelete: Cascade)
  projectId String?
  project   Project? @relation("ProjectFavorites", fields: [projectId], references: [id], onDelete: Cascade)
  sectionId String?
  section   Section? @relation("SectionFavorites", fields: [sectionId], references: [id], onDelete: Cascade)

  @@unique([userId, pageId])
  @@unique([userId, projectId])
  @@unique([userId, sectionId])
  @@index([userId])
  @@map("favorites")
}

// ─────────────────────────────────────────────
// VIEW
// ─────────────────────────────────────────────

model View {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  count     Int      @default(1)
  lastSeenAt DateTime @default(now())

  // Polymorphic targets
  pageId    String?
  page      Page?    @relation("PageViews", fields: [pageId], references: [id], onDelete: Cascade)
  projectId String?
  project   Project? @relation("ProjectViews", fields: [projectId], references: [id], onDelete: Cascade)
  sectionId String?
  section   Section? @relation("SectionViews", fields: [sectionId], references: [id], onDelete: Cascade)

  @@unique([userId, pageId])
  @@unique([userId, projectId])
  @@unique([userId, sectionId])
  @@index([pageId])
  @@index([projectId])
  @@index([sectionId])
  @@map("views")
}

// ─────────────────────────────────────────────
// ACTIVITY
// ─────────────────────────────────────────────

model Activity {
  id           String       @id @default(cuid())
  userId       String
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  type         ActivityType
  resourceType ResourceType
  details      String?
  ip           String?
  createdAt    DateTime     @default(now())

  // Polymorphic targets
  pageId    String?
  page      Page?    @relation("PageActivities", fields: [pageId], references: [id], onDelete: SetNull)
  projectId String?
  project   Project? @relation("ProjectActivities", fields: [projectId], references: [id], onDelete: SetNull)
  sectionId String?
  section   Section? @relation("SectionActivities", fields: [sectionId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([resourceType])
  @@index([pageId])
  @@index([projectId])
  @@index([sectionId])
  @@map("activities")
}

// ─────────────────────────────────────────────
// SETTING
// ─────────────────────────────────────────────

model Setting {
  id    String @id @default(cuid())
  key   String @unique
  value String

  @@map("settings")
}

// ─────────────────────────────────────────────
// EMAIL INVITE
// ─────────────────────────────────────────────

model EmailInvite {
  id          String    @id @default(cuid())
  email       String    @unique
  name        String
  role        Role      @default(GUEST)
  sentById    String
  sentBy      User      @relation("InviteSentBy", fields: [sentById], references: [id])
  acceptedAt  DateTime?
  expiresAt   DateTime
  token       String    @unique @default(cuid())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([token])
  @@map("email_invites")
}

// ─────────────────────────────────────────────
// REFRESH TOKEN
// (not in v1 — needed for JWT rotation)
// ─────────────────────────────────────────────

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  revokedAt DateTime?

  @@index([userId])
  @@index([token])
  @@map("refresh_tokens")
}
```

---

## 8. API Design Conventions

### URL Structure

```
/api/v1/{resource}
/api/v1/{resource}/{id}
/api/v1/{resource}/{id}/{sub-resource}
```

### Standard Response Envelope

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": {             // only on paginated responses
    "page": 1,
    "perPage": 20,
    "total": 143,
    "totalPages": 8
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title field is required.",
    "details": [        // only on validation errors
      { "field": "title", "message": "Required" }
    ]
  }
}
```

### HTTP Status Codes

| Code | When |
|---|---|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (created) |
| 204 | Successful DELETE (no body) |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate slug, email, etc.) |
| 422 | Unprocessable entity |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### Pagination

All list endpoints accept:
```
GET /api/v1/pages?page=1&perPage=20&sort=createdAt&order=desc
```

### Filtering

```
GET /api/v1/pages?projectId=xxx&isDraft=false&visibility=PUBLIC
GET /api/v1/tags?name=typescript
GET /api/v1/activities?userId=xxx&resourceType=PAGE
```

---

## 9. Authentication Flow

### Access Token + Refresh Token Pattern

```
┌────────────┐         POST /auth/login          ┌───────────┐
│  Frontend  │ ─────────────────────────────────> │   API     │
│            │ <───────────────────────────────── │           │
│            │  { accessToken }                   │           │
│            │  Set-Cookie: refreshToken (HttpOnly)│           │
└────────────┘                                    └───────────┘

Access token:  JWT, short-lived (15 min), stored in memory
Refresh token: Opaque token, long-lived (30 days), HttpOnly cookie
```

### Token Refresh

```
Frontend axios interceptor:
  - On 401 response → POST /auth/refresh (sends cookie automatically)
  - Receives new accessToken
  - Retries original request
  - On refresh failure → redirect to /login
```

### Endpoints

| Method | URI | Auth | Description |
|---|---|---|---|
| POST | /api/v1/auth/login | No | Email + password login |
| POST | /api/v1/auth/logout | Yes | Revoke refresh token |
| POST | /api/v1/auth/refresh | Cookie | Get new access token |
| POST | /api/v1/auth/register | No | Self-registration (if enabled) |
| POST | /api/v1/auth/forgot-password | No | Request password reset email |
| POST | /api/v1/auth/reset-password | No | Submit new password with token |
| POST | /api/v1/auth/verify-email | No | Submit email verification token |
| GET  | /api/v1/auth/me | Yes | Current user info |
| POST | /api/v1/auth/invite/{token} | No | Complete invitation registration |

---

## 10. File Storage Strategy

### Upload Flow

```
1. Frontend: multipart/form-data POST to /api/v1/images
2. Fastify multipart plugin receives file buffer
3. sharp resizes/optimizes image (max 2000px wide, 80% quality)
4. Upload to S3-compatible storage under:
   uploads/{userId}/{year}/{month}/{nanoid()}.{ext}
5. Create Image record in DB with url, path, type
6. Return { id, url } to frontend
```

### Local Development

Use **MinIO** (S3-compatible) via Docker Compose. Zero code changes needed — just swap env vars.

```yaml
# docker-compose.yml
services:
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
```

### Inline Images in Page Content

Tiptap handles image uploads natively. Configure a custom upload handler:

```typescript
// Tiptap image upload extension config
uploadFn: async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'INLINE')
  const { data } = await api.post('/images', formData)
  return data.url   // Tiptap replaces the blob URL with the CDN URL
}
```

No base64 is ever stored in the database. The editor sends the file immediately on paste/drop.

---

## 11. Email Strategy

### Queue-based Sending

All emails are sent via BullMQ workers, never synchronously in request handlers.

```
Request handler
  └── queue.add('send-email', { to, template, data })
        └── email.worker.ts picks up job
              └── renders React Email template
                    └── sends via Nodemailer
```

### Email Templates

Use **React Email** — write email templates as React components, render to HTML string.

```typescript
// emails/invite.tsx
import { Html, Button, Text } from '@react-email/components'

export function InviteEmail({ name, inviteUrl }: Props) {
  return (
    <Html>
      <Text>Hi {name}, you've been invited to GiGaWiki.</Text>
      <Button href={inviteUrl}>Accept Invitation</Button>
    </Html>
  )
}
```

### Email Types

| Template | Trigger |
|---|---|
| `WelcomeEmail` | Self-registration |
| `VerifyEmailEmail` | Email verification |
| `InviteEmail` | Admin invites user |
| `ResetPasswordEmail` | Forgot password |

---

## 12. Search Strategy

### Phase 1 — PostgreSQL Full-Text Search (free, built-in)

Add a generated `tsvector` column to `pages`:

```prisma
// In schema.prisma — add to Page model:
searchVector  Unsupported("tsvector")?

// Raw SQL migration:
// ALTER TABLE pages ADD COLUMN search_vector tsvector
//   GENERATED ALWAYS AS (
//     to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
//   ) STORED;
// CREATE INDEX pages_search_vector_idx ON pages USING gin(search_vector);
```

Query:
```sql
SELECT * FROM pages
WHERE search_vector @@ plainto_tsquery('english', $1)
ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC;
```

### Phase 2 — Meilisearch (when you need better ranking/typo tolerance)

- Self-hosted or Meilisearch Cloud
- Sync pages to Meilisearch index after create/update via BullMQ job
- Client: `meilisearch` npm package

---

## 13. Real-time Strategy

For future collaborative editing or live notifications, use **Socket.io** with Redis adapter (scales across multiple API instances).

```typescript
// Notification events (phase 1 — simpler)
socket.emit('activity:new', { type: 'COMMENTED', pageId, user })
socket.emit('page:updated',  { pageId, updatedBy })

// Collaborative editing (phase 2 — complex)
// Use Yjs + y-websocket for CRDT-based real-time co-editing
```

---

## 14. Environment Variables

```env
# ── App ──────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# ── Database ─────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gigawiki

# ── Redis ────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── JWT ──────────────────────────────────────────────────────────
JWT_SECRET=your-very-long-secret-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# ── Storage ──────────────────────────────────────────────────────
STORAGE_DRIVER=s3                  # 's3' or 'local'
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
AWS_BUCKET=gigawiki
AWS_ENDPOINT=http://localhost:9000  # remove for real AWS

# ── Email ────────────────────────────────────────────────────────
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_user
SMTP_PASS=your_pass
SMTP_FROM=noreply@gigawiki.com
SMTP_FROM_NAME=GiGaWiki

# ── Optional: Meilisearch ────────────────────────────────────────
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=masterKey
```

---

## 15. Development Workflow

### First-time Setup

```bash
# 1. Clone and install
git clone https://github.com/your-org/gigawiki-v2
cd gigawiki-v2
npm install

# 2. Start local services (PostgreSQL + Redis + MinIO)
docker compose up -d

# 3. Copy env and configure
cp .env.example apps/api/.env
cp .env.example apps/web/.env

# 4. Run migrations and seed
cd apps/api
npx prisma migrate dev
npx prisma db seed

# 5. Start dev servers (from root)
cd ../..
npm run dev        # runs api + web in parallel via Turborepo
```

### Daily Commands

```bash
npm run dev              # Start all apps in watch mode
npm run build            # Build all apps
npm run test             # Run all tests
npm run lint             # Lint all packages
npm run typecheck        # Type-check all packages

# Prisma
npx prisma migrate dev --name add_column_x   # Create migration
npx prisma studio                             # GUI for DB
npx prisma generate                           # Regenerate client after schema change
```

### Docker Compose (Local Services)

```yaml
# docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: gigawiki
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

---

*Document version 1.0 — GiGaWiki V2 Planning — April 2026*
