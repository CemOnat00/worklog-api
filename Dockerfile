# =============================================================================
# Multi-stage build
#
# Amaç: derleme için gereken araçların (TypeScript, ESLint, test kütüphaneleri)
# production image'ına sızmaması. Bu hem boyutu küçültür hem saldırı yüzeyini
# daraltır — çalışmayan bir paket, açığı olan bir paket olamaz.
#
# Hedefler:
#   development → Compose'un kullandığı, hot-reload yapan geliştirme ortamı
#   production  → sadece derlenmiş JS + runtime bağımlılıkları
#
# Kullanım:
#   docker build --target production -t worklog-api:prod .
#   docker build --target development -t worklog-api:dev .
# =============================================================================

# --- Ortak taban ------------------------------------------------------------
FROM node:24-alpine AS base
WORKDIR /app

# Yalnızca manifest kopyalanıyor. Kaynak kod değiştiğinde bir alttaki
# `npm ci` katmanı cache'ten gelir — layer cache mantığı budur.
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
# devDependencies burada gerekli: TypeScript derleyicisi onların içinde
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build


# --- Production -------------------------------------------------------------
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# `--omit=dev` → TypeScript, ESLint, Vitest ve diğer geliştirme araçları YOK
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Yalnızca derlenmiş çıktı taşınıyor; kaynak .ts dosyaları image'a girmiyor
COPY --from=build /app/dist ./dist

# root olarak çalıştırmıyoruz: container'da bir açık bulunursa
# saldırganın elindeki yetki sınırlı kalır.
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

# Container seviyesinde sağlık kontrolü. `/health` kullanılıyor (`/health/ready`
# değil): bu kontrol "süreç ayakta mı" sorusuna cevap veriyor. Veritabanı
# düştüğünde container yeniden başlatılmamalı — o readiness'ın işi.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# npm üzerinden değil, doğrudan node ile başlatılıyor.
# Sebep: npm araya bir süreç daha koyuyor ve SIGTERM sinyalini Node'a
# iletmiyor — graceful shutdown çalışmıyor.
CMD ["node", "dist/server.js"]
