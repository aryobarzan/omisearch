# Stage 1: packages
FROM node:24-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@12.23.0
# install packages based on local lockfile to avoid version mismatches
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: source code, build
FROM node:24-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@12.23.0
# re-use installed packages from deps stage
COPY --from=deps /app/node_modules ./node_modules
# copy source code
COPY . .
# opt out of anonymous telemetry
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Stage 3: environment variables, non-root user, run server
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"
# non-root user `nextjs`
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
# copy public assets (images)
COPY --from=builder /app/public ./public
# copy built next.js server from stage 2
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# copy static assets from stage 2
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# set active user
USER nextjs
# the port used by frontend server
EXPOSE 3000
# run server
CMD ["node", "server.js"]
