# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A real DATABASE_URL isn't needed at build time — drizzle's client doesn't
# connect until a query actually runs — but the var must exist or Next's
# module evaluation of src/db/index.ts throws during the build trace step.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV SESSION_SECRET="build-time-placeholder-not-used-at-runtime-000000"
RUN npm run build
# Compiled separately from the Next build: this is the one-off migration
# runner (see scripts/migrate.ts). Bundled with esbuild rather than plain
# tsc because drizzle-orm never ends up in .next/standalone/node_modules —
# Next inlines it directly into the server chunks it builds, since nothing
# else needs it as a loose dependency. `pg` is left external since it IS
# still present there (the app's own DB layer needs it as a real runtime
# dependency, unlike drizzle-orm).
RUN npx esbuild scripts/migrate.ts --bundle --platform=node --target=node22 --format=cjs --outfile=dist/migrate.js --external:pg --external:pg-native

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/dist/migrate.js ./migrate.js
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
