FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/game-engine/package.json packages/game-engine/
COPY packages/fairness/package.json packages/fairness/
COPY packages/config/package.json packages/config/
COPY prisma/package.json prisma/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/prisma/node_modules ./prisma/node_modules
COPY . .
RUN pnpm turbo run build --filter=@ronda/api...
RUN cd prisma && pnpm prisma generate

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/api
EXPOSE 3001

CMD ["node", "dist/main.js"]
