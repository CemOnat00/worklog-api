# =============================================================================
# Geliştirme ortamı image'ı.
#
# Bu dosya şu an yalnızca docker-compose'un geliştirme ortamını ayağa
# kaldırmasına yetecek kadarını yapıyor.
#
# Perşembe (issue #15) kapsamında yapılacaklar:
#   - multi-stage build (build / production hedeflerinin ayrılması)
#   - devDependencies'in production image'ına sızmaması
#   - non-root kullanıcı
#   - HEALTHCHECK
#   - image boyutu ölçümü
# =============================================================================

FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
