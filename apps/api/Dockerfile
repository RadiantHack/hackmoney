# Build from repo root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8.15.6 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/backend/package.json packages/backend/prisma ./packages/backend/
COPY packages/error-handler/package.json packages/error-handler/tsconfig.json packages/error-handler/tsup.config.ts packages/error-handler/src ./packages/error-handler/
COPY packages/logger/package.json packages/logger/tsconfig.json packages/logger/tsup.config.ts packages/logger/src ./packages/logger/
COPY packages/config-eslint/package.json packages/config-eslint/*.js ./packages/config-eslint/
COPY packages/config-typescript/package.json packages/config-typescript/*.json ./packages/config-typescript/
COPY packages/jest-presets/package.json packages/jest-presets ./packages/jest-presets/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @openpay/backend build && pnpm --filter @openpay/error-handler build && pnpm --filter @openpay/logger build
RUN pnpm --filter api build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/index.cjs"]
