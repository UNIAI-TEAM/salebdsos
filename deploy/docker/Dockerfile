# Multi-stage build for the TanStack Start app
FROM oven/bun:1.1 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl tini postgresql-client && \
    rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json
COPY deploy/scripts ./deploy/scripts
RUN chmod +x ./deploy/scripts/*.sh
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node",".output/server/index.mjs"]
