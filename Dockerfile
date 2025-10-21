# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source code
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .

# Production stage
FROM base AS production

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./
COPY --from=build /app/tsconfig.json ./

# Run as non-root user
USER bun
EXPOSE 8080

# Health check - curl the health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["bun", "run", "start"]
