# ── Stage 1: build the React + Vite frontend ──────────────
FROM node:22-alpine AS build

WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

COPY index.html vite.config.mjs ./
COPY assets/ ./assets/
COPY src/ ./src/
RUN pnpm run build

# ── Stage 2: runtime (Express + sandboxed CLI tools) ──────
FROM node:22-alpine

RUN apk add --no-cache jq gawk grep sed coreutils

WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY server.js ./
COPY --from=build /app/dist ./dist

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
