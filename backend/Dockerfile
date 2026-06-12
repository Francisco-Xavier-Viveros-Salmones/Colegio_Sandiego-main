# ============================================================
# SAE Colegio San Diego — Dockerfile
# Node.js 20 LTS · imagen mínima · PostgreSQL 16
# ============================================================

FROM node:20-alpine AS base

WORKDIR /app

# Instalar dependencias del sistema para Prisma y PostgreSQL client
RUN apk add --no-cache openssl postgresql-client

# ── Dependencias ─────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ── Build ─────────────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Crear directorio de backups y transferir propiedad al usuario node (hardening)
# La imagen node:alpine incluye el usuario 'node' (uid 1000) por defecto.
RUN mkdir -p /app/backups && chown -R node:node /app

# Hardening: ejecutar el proceso Node como usuario no-root
USER node

# Generar Prisma Client para el entorno de producción (como usuario node)
RUN npx prisma generate

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
