# GiGaWiki V2

A self-hosted wiki built with Fastify, React 19, PostgreSQL and TypeScript in a Turborepo monorepo.

## Getting started

You need Node 22, Docker and Compose. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for first-time setup, the `dev` → `main` workflow, commits and validation commands.

```sh
git clone https://github.com/gigapin/gigawiki-v2.git
cd gigawiki-v2
cp .env.example .env
# Configure the root .env before continuing.
./bin/pnpm install --frozen-lockfile
docker compose -f docker-compose.yml up -d
./bin/pnpm --filter gigawiki-v2-api exec prisma generate
./bin/pnpm --filter gigawiki-v2-api exec prisma migrate deploy
./bin/pnpm dev
```

The web normally runs at http://localhost:5173 and the API at http://localhost:3001. Optional demo seeding and account details are in CONTRIBUTING.

## Stack

- Backend: Fastify, TypeScript, Prisma, PostgreSQL and Redis.
- Frontend: React 19, Vite, TanStack Router/Query, Tailwind CSS and shadcn/ui.
- Storage: persistent local files or MinIO/S3; email: SMTP with a queued worker.
- Shared: Zod schemas and TypeScript types in `packages/shared`.
- Monorepo: pnpm workspaces and Turborepo.

## Development and checks

- [Contributing](CONTRIBUTING.md): setup, branches, commit conventions and PR checklist.
- [CI](docs/CI.md): quality, API/web tests, builds and artifacts.
- [Database tests](docs/DATABASE_TESTS.md): integrations on disposable PostgreSQL.
- [Settings](docs/SETTINGS.md): migrations and account/admin features.
- [Session log](docs/SESSION_LOG.md): current implementation state and next steps.
- [V2 release checklist](docs/V2_RELEASE_CHECKLIST.md): completed checks, access policy rollout and remaining acceptance tests.

- [V1 feature implementation](docs/V1_FEATURE_IMPLEMENTATION.md): added features, PDF renderer setup and pending application schema update; no V1 data migration.
