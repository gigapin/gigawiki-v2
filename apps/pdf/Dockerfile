FROM ghcr.io/puppeteer/puppeteer:25.14.0
USER root
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/pdf/package.json apps/pdf/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/wiki/package.json packages/wiki/
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN corepack enable && pnpm install --filter gigawiki-pdf --frozen-lockfile --ignore-scripts
COPY apps/pdf apps/pdf
RUN pnpm --filter gigawiki-pdf build && chown -R pptruser:pptruser /app
USER pptruser
EXPOSE 3002
CMD ["node", "apps/pdf/dist/server.js"]
