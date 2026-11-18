# Production image for the OGSERC portal. Runs on any host with Docker.
# Build:  docker build -t ogserc-portal .
# Run:    docker run --env-file .env -p 3000:3000 ogserc-portal

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Install dependencies from the lockfile only.
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 2. Build the app as a self-contained ("standalone") server.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone
# Placeholders so the config loads during the build. Nothing connects to a database here;
# real values are supplied at run time.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build \
    PAYLOAD_SECRET=build-time-placeholder-not-a-secret
# "off" only for a host whose CPU cannot run sharp (D-056). Next.js reads it at build time.
ARG IMAGE_PROCESSING=on
ENV IMAGE_PROCESSING=${IMAGE_PROCESSING}
# Umami website ID for visitor statistics (D-077). Not a secret: it appears in every page. Static
# pages are rendered here, so it is needed at build time; empty leaves statistics off.
ARG UMAMI_WEBSITE_ID=
ENV UMAMI_WEBSITE_ID=${UMAMI_WEBSITE_ID}
RUN pnpm build

# 3. Small runtime image, running as a non-root user.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Pending database migrations run automatically on startup (Payload prodMigrations).
CMD ["node", "server.js"]
