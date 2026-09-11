# ==============================================================================
# STAGE 1: Frontend Builder
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Copy frontend dependency manifests
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code and compile production assets
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# STAGE 2: Production Server
# ==============================================================================
FROM node:20-alpine AS production
WORKDIR /app

# Install native build tools for compiling native C++ addons (better-sqlite3 & sharp)
RUN apk add --no-cache python3 make g++

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Copy backend dependency manifests & install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production && \
    apk del python3 make g++ && \
    rm -rf /var/cache/apk/*

# Copy backend source code
COPY backend/ ./

# Copy compiled frontend from Stage 1 into backend/public for SPA serving
COPY --from=frontend-builder /build/dist ./public

# Ensure required persistent storage directories exist
RUN mkdir -p /app/data /app/uploads/images /app/uploads/audio

EXPOSE 3001

CMD ["node", "src/server.js"]
