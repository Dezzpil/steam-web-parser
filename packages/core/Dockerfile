FROM node:24-bookworm-slim AS base

# Install OS deps required for Chromium (Puppeteer)
RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libxkbcommon0 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libpango-1.0-0 \
    libatspi2.0-0 \
    libx11-6 \
    libxext6 \
    libx11-xcb1 \
    curl \
    git \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
RUN PUPPETEER_SKIP_DOWNLOAD=false corepack install \
  && PUPPETEER_SKIP_DOWNLOAD=false pnpm install --frozen-lockfile

COPY packages/core ./packages/core
# Generate Prisma client for core package
# DATABASE_URL is required by prisma.config.ts at generate time (not for actual DB connection)
ARG DATABASE_URL=postgresql://user:password@localhost:5432/db
RUN DATABASE_URL=${DATABASE_URL} pnpm --filter @steam-web-parser/core run prisma:generate

# Preinstall Chrome for Puppeteer (v24+ requires explicit browser install)
RUN PUPPETEER_CACHE_DIR=/tmp/puppeteer pnpm --filter @steam-web-parser/core exec puppeteer browsers install chrome

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${API_PORT:-3000}/health || exit 1
CMD ["pnpm", "--filter", "@steam-web-parser/core", "run", "api"]
