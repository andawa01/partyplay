# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci

FROM deps AS build
COPY server ./server
COPY client ./client
RUN npx prisma generate --schema server/prisma/schema.prisma
RUN npm run build

# Migration runner keeps the Prisma CLI and source available, so it can also be used
# for one-off admin scripts. It is not the long-running API image.
FROM build AS migrate
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy", "--schema", "server/prisma/schema.prisma"]

FROM build AS production-deps
RUN npm prune --omit=dev

FROM base AS api
ENV NODE_ENV=production
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/package.json ./package.json
COPY --from=production-deps /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
USER node
EXPOSE 4000
CMD ["node", "server/dist/index.js"]

FROM caddy:2-alpine AS web
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/client/dist /srv
