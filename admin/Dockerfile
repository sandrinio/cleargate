# syntax=docker/dockerfile:1.7
#
# Multi-stage Dockerfile for ClearGate Admin UI — STORY-006-10
# Mirrors mcp/Dockerfile three-stage pattern: deps → builder → runtime
# Base image: node:24-alpine | Non-root user: node | Port: 3000

# ------ Production dependencies ------
FROM node:24-alpine AS deps
WORKDIR /app

# Copy workspace root manifests (npm workspaces requires root package-lock.json)
COPY package.json package-lock.json ./

# Copy only the package.json files needed for workspace resolution
COPY admin/package.json ./admin/
COPY cleargate-cli/package.json ./cleargate-cli/

# Install production-only deps for the admin workspace.
# --ignore-scripts blocks arbitrary postinstall code from transitive deps.
RUN npm ci --workspace admin --omit=dev --ignore-scripts

# ------ Build stage ------
FROM node:24-alpine AS builder
WORKDIR /app

# Force devDeps even when build env sets NODE_ENV=production.
# Coolify and many CI systems inject NODE_ENV=production at build time,
# which otherwise silently strips TypeScript/svelte/vite, breaking npm run build.
ENV NODE_ENV=development

# PUBLIC_MCP_URL is baked into the client bundle by Vite at build time (SvelteKit
# $env/static/public convention). Must be the URL the BROWSER uses to reach MCP,
# not the URL the container uses. Pass at build time with:
#   docker build --build-arg PUBLIC_MCP_URL=http://localhost:3000 ...
ARG PUBLIC_MCP_URL=http://localhost:3000
ENV PUBLIC_MCP_URL=$PUBLIC_MCP_URL

# Copy workspace root manifests
COPY package.json package-lock.json ./
COPY admin/package.json ./admin/
COPY cleargate-cli/package.json ./cleargate-cli/

# Install all workspace deps (including devDeps).
# Must install all workspaces — not just admin — so that the `cleargate`
# workspace package (cleargate-cli) gets symlinked into node_modules/cleargate.
# Without this, Vite cannot resolve "cleargate/admin-api" at build time.
RUN npm ci --ignore-scripts

# Copy source files
COPY admin/ ./admin/
COPY cleargate-cli/ ./cleargate-cli/
# cleargate-cli's prebuild copies meta-root cleargate-planning/ into its templates,
# so the sibling source must be present in the build context.
COPY cleargate-planning/ ./cleargate-planning/

# Build cleargate-cli FIRST — admin's vite imports `cleargate/admin-api`
# which resolves via workspace symlink to cleargate-cli/dist/. dist/ is
# gitignored, so fresh CI clones (Coolify) must compile it here.
RUN npm run build --workspace cleargate-cli

# Build admin — outputs to admin/build/
RUN npm run build --workspace admin

# ------ Runtime stage ------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache dumb-init

# Copy production node_modules from the deps stage
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy the SvelteKit adapter-node build output
COPY --from=builder --chown=node:node /app/admin/build ./build

# Copy package.json for adapter-node runtime metadata
COPY --from=builder --chown=node:node /app/admin/package.json ./

# Run as non-root user (uid=1000 in node:24-alpine)
USER node

EXPOSE 3000

# Coolify + Dockerfile HEALTHCHECK — hits our /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
# adapter-node entry point (SvelteKit adapter-node convention)
CMD ["node", "build"]
