# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npm run build; test -f dist/index.js

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# OpenSSL necessário para o Prisma schema/query engine no Alpine
RUN apk add --no-cache openssl

# Apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Prisma schema + gerar client
COPY prisma ./prisma
RUN npx prisma generate

# Build compilado
COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
