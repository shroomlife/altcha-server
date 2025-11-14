# ============================================================================
# Stage 1: Base
# ============================================================================
FROM oven/bun:1-alpine AS base
WORKDIR /app

# ============================================================================
# Stage 2: Dependencies
# ============================================================================
FROM base AS dependencies

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# ============================================================================
# Stage 3: Build
# ============================================================================
FROM base AS build

# Copy package files
COPY package.json bun.lockb* ./

# Install all dependencies (including dev)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Type check (optional, comment out if no tsconfig.json)
RUN bun run type-check || true

# ============================================================================
# Stage 4: Production
# ============================================================================
FROM base AS production

# Set environment
ENV NODE_ENV=production \
    PORT=8080

# Create non-root user
RUN addgroup -g 1001 -S altcha && \
    adduser -S altcha -u 1001 && \
    chown -R altcha:altcha /app

# Copy dependencies from dependencies stage
COPY --from=dependencies --chown=altcha:altcha /app/node_modules ./node_modules

# Copy application code
COPY --chown=altcha:altcha . .

# Switch to non-root user
USER altcha

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun run -e "fetch('http://localhost:8080/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["bun", "run", "src/index.ts"]
