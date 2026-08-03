# =============================================================================
# Multi-stage Dockerfile
#
# Amaç: derleme için gereken araçların (TypeScript, devDependencies) son
# image'a sızmaması. Böylece production image'ı hem küçük hem daha güvenli olur.
#
# Hedefler:
#   development → compose'un kullandığı, hot-reload yapan geliştirme ortamı
#   production  → sadece derlenmiş JS + runtime bağımlılıkları
# =============================================================================

# --- Ortak taban ------------------------------------------------------------
FROM node:24-alpine AS base
WORKDIR /app
# Sadece manifest'i kopyalıyoruz: kaynak kod değiştiğinde npm ci katmanı
# cache'ten gelsin diye. Layer cache mantığı budur.
COPY package*.json ./


# --- Geliştirme -------------------------------------------------------------
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]


# --- Derleme ----------------------------------------------------------------
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build


# --- Production -------------------------------------------------------------
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Sadece runtime bağımlılıkları
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Derlenmiş çıktı
COPY --from=build /app/dist ./dist

# root olarak çalıştırmıyoruz
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
