# syntax=docker/dockerfile:1

# ── Stage 1: build ────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Manifests first so the install layer caches independently of source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

# Generate before compiling: tsc needs the generated Prisma client types, and
# without them @prisma/client resolves to `any` and the build fails.
# Run from apps/api because Prisma 7 discovers prisma.config.ts relative to the
# working directory, and that config supplies the schema path and datasource.
RUN cd apps/api && pnpm exec prisma generate

RUN pnpm --filter gigawiki-v2-api build

# Collect a self-contained, production-only tree. This drops every devDependency
# (typescript, vitest, the prisma CLI, esbuild) and flattens pnpm's symlinked
# store, so the runtime stage needs nothing from the workspace layout.
RUN pnpm --filter gigawiki-v2-api deploy --prod --legacy /app/deploy

# `prisma generate` writes the client into pnpm's store beside @prisma/client,
# which `pnpm deploy` does not carry over. Node resolves `.prisma/client` by
# walking up from @prisma/client, so it belongs at the deploy root.
RUN cp -R /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma \
          /app/deploy/node_modules/.prisma

# `pnpm deploy` keeps @prisma/client's optional peers (the prisma CLI and
# typescript) and everything they drag in — Studio, pglite, effect, prettier.
# None of it is reachable at runtime; dropping it roughly halves the image.
# The smoke test in the runtime stage is what proves this is safe.
# Only the prisma CLI / typescript trees are removed. Note that prettier and
# react-dom look dev-only but are genuine runtime deps of @react-email/render.
RUN cd /app/deploy/node_modules/.pnpm && rm -rf \
      prisma@* \
      typescript@* \
      @prisma+studio-core@* \
      @electric-sql+pglite@* \
      effect@* \
      chart.js@*

# ── Stage 2: runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/deploy ./

EXPOSE 3002

CMD ["node", "dist/server.js"]
