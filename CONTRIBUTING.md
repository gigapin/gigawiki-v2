# Contributing to GiGaWiki

## Branches and pull requests

Use `dev` as the integration branch and `main` for releases. This repository uses `dev` in place of the `develop` name in the original specification; CI runs on both `dev` and `main`. Create feature branches from an updated `dev`:

```sh
git switch dev
git pull --ff-only origin dev
git switch -c feat/short-description
```

Use `feat/`, `fix/` or `chore/` prefixes. Open pull requests into `dev`; promote tested changes from `dev` to `main` with a release pull request. Keep changes focused and describe the problem, resulting behavior and validation. See [CI instructions](docs/CI.md) for check names and [repository configuration](docs/REPOSITORY.md) for the protection policy and its verified state.

Commits follow Conventional Commits. Allowed types are `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci` and `build`, for example `fix: preserve editor content while saving`. Husky runs lint-staged and commitlint. Use Node 22 on the shell PATH, including the environment used by Git hooks; the session log documents the local fnm/Husky setup.

## First-time setup

Install Node 22 (see `.nvmrc`) and Docker with Compose. The repository wrapper `./bin/pnpm` installs the pnpm version pinned in `package.json` into the gitignored `.tools` directory; npm and Node must already be available.

```sh
git clone https://github.com/gigapin/gigawiki-v2.git
cd gigawiki-v2
cp .env.example .env
./bin/pnpm install --frozen-lockfile
```

Edit the root `.env` before starting services. Match `POSTGRES_PORT` to the port in `DATABASE_URL`, choose an available port and configure SMTP credentials. The default PostgreSQL host port in the example is 5433; this workstation may use another port. The API loads the root `.env`, not `apps/api/.env`. Keep credentials out of commits.

Start only the backing services, generate Prisma Client and apply existing migrations:

```sh
docker compose -f docker-compose.yml up -d
./bin/pnpm --filter gigawiki-v2-api exec prisma generate
./bin/pnpm --filter gigawiki-v2-api exec prisma migrate deploy
```

The explicit Compose file avoids automatically starting the Docker API from `docker-compose.override.yml`, which would occupy port 3001 while the local API is running. The backing services are PostgreSQL, Redis and MinIO; search uses PostgreSQL full-text search. MinIO is available at port 9002, its console at 9001; the initializer creates the `gigawiki` bucket.

On a new local development database, optionally add demo accounts and content:

```sh
./bin/pnpm --filter gigawiki-v2-api exec prisma db seed
```

The demo accounts are `admin@gigawiki.local` and `editor@gigawiki.local`, both with password `Admin1234!`. Use seed only for local demo data. Existing application databases do not need to be reseeded for development or testing.

Start the development servers:

```sh
./bin/pnpm dev
```

The API listens on port 3001; Vite normally serves the web at http://localhost:5173 and proxies `/api` to the API. If port 5173 is occupied, use the displayed Vite port and align `FRONTEND_URL` for CORS and email links. Production can set `VITE_API_URL`; same-origin requests are the default.

## Validation

Run the same package checks used by CI from the repository root:

```sh
./bin/pnpm turbo typecheck lint
./bin/pnpm --filter gigawiki-v2-api test
./bin/pnpm --filter web test
./bin/pnpm turbo build
```

The ordinary API command skips the three opt-in PostgreSQL suites. Follow [DATABASE_TESTS.md](docs/DATABASE_TESTS.md) using only a disposable, dedicated database named `gigawiki_test`, with an explicit shell `DATABASE_URL`. The API and Settings suites roll back their fixtures; the parity suite commits concurrent transactions and cleans up its own fixtures. CI applies migrations to a fresh database and executes all three suites. Never target the application database for these checks. Browser interactions follow the [manual test guide](docs/V2_MANUAL_TESTS.md); jsdom tests do not replace them. Settings-specific instructions are in [SETTINGS.md](docs/SETTINGS.md).

For a schema change, generate and inspect a migration on a disposable development database, commit its SQL alongside `schema.prisma`, and regenerate Prisma Client. Verify the complete migration chain on an empty database. Applying production/app migrations is an operator action; do not use `migrate reset` on an existing application database.

## Pull request checklist

- Describe the concrete problem and the behavior after the change.
- Lint, typecheck, relevant tests and build pass; all four CI jobs pass before release into `main`.
- Add meaningful coverage for changed behavior when needed; report manual browser verification for UI changes.
- Include a reviewed migration when the database schema changes and verify it against a fresh database.
- Update relevant docs; record completed work and remaining checks in `docs/SESSION_LOG.md`.
- Keep secrets and machine-specific settings out of the diff.
