# Multi-stage Dockerfile — STORY-006-01 minimal stub
# STORY-006-10 owns production-grade hardening (non-root user, health check, etc.)

# --- Build stage ---
FROM node:24-alpine AS build

WORKDIR /app

# Copy workspace root (needed for npm workspaces)
COPY package.json package-lock.json ./
COPY admin/package.json ./admin/
COPY cleargate-cli/package.json ./cleargate-cli/
COPY mcp/package.json ./mcp/ 2>/dev/null || true

# Install all workspace deps
RUN npm ci --workspace admin

# Copy admin source
COPY admin/ ./admin/
COPY cleargate-cli/ ./cleargate-cli/

# Build admin
RUN npm run build --workspace admin

# --- Runtime stage ---
FROM node:24-alpine AS runtime

WORKDIR /app

# Copy built output from build stage
COPY --from=build /app/admin/build ./build
COPY --from=build /app/admin/package.json ./

# Production dependencies only
RUN npm install --omit=dev --ignore-scripts

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# adapter-node serves from build/
CMD ["node", "build"]
