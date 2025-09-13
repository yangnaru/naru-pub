FROM node:24-slim

# Install system dependencies for Playwright in single layer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup pnpm in single layer
RUN npm install --global corepack@latest && \
    corepack enable pnpm && \
    corepack use pnpm@latest-10

# Copy dependency files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies (this layer will be cached unless package files change)
RUN pnpm install --frozen-lockfile && \
    npx playwright install chromium

# Set build arguments and environment early
ARG NEXT_PUBLIC_DOMAIN=naru.pub
ENV NEXT_PUBLIC_DOMAIN=$NEXT_PUBLIC_DOMAIN

# Copy config files (less frequently changed)
COPY components.json \
     kysely.config.ts \
     next.config.mjs \
     postcss.config.mjs \
     sentry.edge.config.ts \
     sentry.server.config.ts \
     tailwind.config.ts \
     tsconfig.json \
     ./

# Copy static assets (less frequently changed)
COPY public/ public/

# Copy source code (most frequently changed - should be last)
COPY src/ src/

# Build the application
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]