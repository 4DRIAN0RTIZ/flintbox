FROM node:22-alpine

RUN apk add --no-cache jq gawk grep sed coreutils

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY server.js ./
COPY public/ ./public/

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
