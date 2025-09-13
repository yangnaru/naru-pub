FROM node:24-slim

# Install system dependencies for Playwright
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

COPY package.json \
     pnpm-lock.yaml \
     ./

RUN npm install --global corepack@latest
RUN corepack enable pnpm
RUN corepack use pnpm@latest-10
RUN pnpm install --frozen-lockfile
RUN npx playwright install chromium

COPY components.json \
     kysely.config.ts \
     next.config.mjs \
     postcss.config.mjs \
     sentry.edge.config.ts \
     sentry.server.config.ts \
     tailwind.config.ts \
     tsconfig.json \
     ./
COPY public/ public/
COPY src/ src/

ARG NEXT_PUBLIC_DOMAIN=naru.pub
ENV NEXT_PUBLIC_DOMAIN=$NEXT_PUBLIC_DOMAIN

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]