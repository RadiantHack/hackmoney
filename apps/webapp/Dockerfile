# Build from repo root: docker build -f apps/webapp/Dockerfile .
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8.15.6 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/webapp/package.json ./apps/webapp/
COPY packages/logger/package.json packages/logger/tsconfig.json packages/logger/tsup.config.ts packages/logger/src ./packages/logger/
COPY packages/ui/package.json packages/ui/tsconfig.json packages/ui/src ./packages/ui/
COPY packages/config-eslint/package.json packages/config-eslint/*.js ./packages/config-eslint/
COPY packages/config-typescript/package.json packages/config-typescript/*.json ./packages/config-typescript/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/webapp/node_modules ./apps/webapp/node_modules
COPY . .
RUN pnpm --filter @openpay/logger build && pnpm --filter @openpay/ui build
RUN pnpm --filter webapp build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=builder /app/apps/webapp/.next/standalone ./
COPY --from=builder /app/apps/webapp/.next/static ./apps/webapp/.next/static
COPY --from=builder /app/apps/webapp/public ./apps/webapp/public
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/webapp/server.js"]
