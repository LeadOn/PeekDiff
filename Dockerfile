# syntax=docker/dockerfile:1

FROM node:alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

# `npm ci` rather than `npm install`: it installs exactly what the lockfile pins and fails if the
# two disagree, so the image cannot silently drift to different dependency versions between builds.
# `--ignore-scripts` is deliberately NOT used: Nuxt's postinstall (`nuxt prepare`) is required.
RUN npm ci

COPY . .

# `nuxi prepare` runs after all sources are copied so tsconfig.json carries the right aliases for the
# Nuxt 4 `app/` directory before the build.
RUN npx nuxi prepare && npm run build

# --- Runtime image -----------------------------------------------------------------------------
FROM node:alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Nitro bundles every server dependency into .output, so the runtime image needs no node_modules
# and no package manager at all.
COPY --from=builder --chown=node:node /app/.output ./

# Drop root. The previous image ran the server as uid 0, which meant a remote code execution in the
# app would have started with full privileges inside the container.
USER node

EXPOSE 3000

# Hits the dependency-free liveness route. It deliberately does not probe the GameOn API: a probe
# that failed whenever the backend had an incident would restart PeekDiff during that incident and
# make the outage worse.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
