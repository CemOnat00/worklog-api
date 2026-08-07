# worklog-api

[![CI](https://github.com/CemOnat00/worklog-api/actions/workflows/ci.yml/badge.svg)](https://github.com/CemOnat00/worklog-api/actions/workflows/ci.yml)

Kişisel iş takip servisi. Notlar, görevler ve takvim etkinliklerini tek bir API
altında toplar; `/agenda` endpoint'i üçünü gün gün birleştirilmiş halde döndürür.

Bir haftalık staj projesi olarak geliştirildi. Tasarım kararlarının gerekçeleri
[`docs/TASARIM.md`](docs/TASARIM.md) dosyasında.

---

## Ne yapar

- **Notlar** — etiketlenebilir, sabitlenebilir, metin araması yapılabilir
- **Görevler** — durum, öncelik, son tarih; nota ve etkinliğe bağlanabilir
- **Etkinlikler** — toplantı ve kişisel etkinlik; tipe göre farklı doğrulama, saat çakışması engellenir
- **Ajanda** — verilen tarih aralığındaki etkinlikler ve görevler, gün gün gruplanmış
- **Kimlik doğrulama** — JWT tabanlı; her kullanıcı yalnızca kendi verisini görür

## Teknoloji

| Katman | Seçim |
|---|---|
| Çalışma ortamı | Node.js 24, TypeScript (CommonJS) |
| Web çatısı | Express 4 |
| Veritabanı | MongoDB 7 + Mongoose |
| Doğrulama | Zod |
| Kimlik doğrulama | JSON Web Token (HS256) + bcrypt |
| Loglama | Pino (yapılandırılmış JSON) |
| Test | Vitest + Supertest |
| Paketleme | Docker (çok aşamalı build) |
| CI/CD | GitHub Actions + GitHub Container Registry |

---

## Hızlı başlangıç

### Docker ile (önerilen)

```bash
git clone https://github.com/CemOnat00/worklog-api.git
cd worklog-api

cp .env.example .env
# .env dosyasını aç, JWT_SECRET satırına gerçek bir değer yaz:
#   openssl rand -base64 48

docker compose up -d --build
```

Hazır olduğunu doğrula:

```bash
curl -s http://localhost:3000/health
curl -s http://localhost:3000/health/ready
```

Durdurmak için `docker compose down`, veriyi de silmek için `docker compose down -v`.

### Docker'sız

MongoDB'nin `localhost:27017` üzerinde çalışıyor olması gerekir.

```bash
npm install
cp .env.example .env      # JWT_SECRET'i doldur
npm run dev
```

---

## Ortam değişkenleri

Uygulama açılışta bu değişkenleri Zod ile doğrular. Eksik veya hatalı bir değer
varsa süreç anlamlı bir mesajla hemen kapanır — yarım yapılandırmayla ayakta
kalmaz.

| Değişken | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|
| `NODE_ENV` | hayır | `development` | `development` \| `test` \| `production` |
| `PORT` | hayır | `3000` | API'nin dinlediği port |
| `MONGO_URI` | **evet** | — | `mongodb` ile başlamalı |
| `JWT_SECRET` | **evet** | — | En az 32 karakter |
| `JWT_EXPIRES_IN` | hayır | `1d` | Token ömrü (`15m`, `1d`, `7d`) |
| `LOG_LEVEL` | hayır | `info` | `silent` testlerde log gürültüsünü kapatır |

`.env` dosyası `.gitignore` içindedir ve asla commit edilmez. `.env.example`
yalnızca yapıyı gösterir, gerçek değer içermez.

---


## Ortam değişkenleri

Uygulama açılışta bu değişkenleri Zod ile doğrular. Eksik veya hatalı bir değer
varsa süreç anlamlı bir mesajla hemen kapanır — yarım yapılandırmayla ayakta
kalmaz.

| Değişken | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|
| `NODE_ENV` | hayır | `development` | `development` \| `test` \| `production` |
| `PORT` | hayır | `3000` | API'nin dinlediği port |
| `MONGO_URI` | **evet** | — | `mongodb` ile başlamalı |
| `JWT_SECRET` | **evet** | — | En az 32 karakter |
| `JWT_EXPIRES_IN` | hayır | `1d` | Token ömrü (`15m`, `1d`, `7d`) |
| `LOG_LEVEL` | hayır | `info` | `silent` testlerde log gürültüsünü kapatır |

`.env` dosyası `.gitignore` içindedir ve asla commit edilmez. `.env.example`
yalnızca yapıyı gösterir, gerçek değer içermez.

---

## API

Taban yol: `/api/v1` — sağlık kontrolleri hariç tüm endpoint'ler `Authorization: Bearer <token>` ister.

### Sağlık

| Method | Yol | Açıklama |
|---|---|---|
| `GET` | `/health` | Liveness — süreç ayakta mı? Hiçbir bağımlılığı kontrol etmez |
| `GET` | `/health/ready` | Readiness — veritabanı bağlı mı? Değilse `503` |

Ayrım bilinçli: veritabanı düştüğünde container yeniden başlatılmamalı, sadece
trafik almamalı.

### Kimlik

| Method | Yol | Açıklama |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Kayıt — token döner |
| `POST` | `/api/v1/auth/login` | Giriş — token döner |
| `GET` | `/api/v1/auth/me` | Token sahibinin bilgileri |

### Notlar

| Method | Yol | Açıklama |
|---|---|---|
| `GET` | `/api/v1/notes` | Listele — `q`, `tag`, `eventId`, `isPinned`, `sort`, `page`, `limit` |
| `POST` | `/api/v1/notes` | Oluştur |
| `GET` | `/api/v1/notes/:id` | Tek kayıt |
| `PATCH` | `/api/v1/notes/:id` | Kısmi güncelle |
| `DELETE` | `/api/v1/notes/:id` | Sil (`204`) |

### Görevler

| Method | Yol | Açıklama |
|---|---|---|
| `GET` | `/api/v1/tasks` | Listele — `status`, `priority`, `tag`, `q`, `noteId`, `eventId`, `dueBefore`, `dueAfter`, `sort`, `page`, `limit` |
| `POST` | `/api/v1/tasks` | Oluştur |
| `GET` | `/api/v1/tasks/:id` | Tek kayıt |
| `PATCH` | `/api/v1/tasks/:id` | Kısmi güncelle |
| `PATCH` | `/api/v1/tasks/:id/status` | Yalnızca durum değiştir |
| `DELETE` | `/api/v1/tasks/:id` | Sil (`204`) |

Durum: `todo` \| `in_progress` \| `done` — Öncelik: `low` \| `medium` \| `high`

### Etkinlikler

| Method | Yol | Açıklama |
|---|---|---|
| `GET` | `/api/v1/events` | Listele — `type`, `from`, `to`, `q`, `sort`, `page`, `limit` |
| `POST` | `/api/v1/events` | Oluştur |
| `GET` | `/api/v1/events/:id` | Tek kayıt |
| `PATCH` | `/api/v1/events/:id` | Kısmi güncelle |
| `DELETE` | `/api/v1/events/:id` | Sil (`204`) |

Tip: `meeting` \| `personal`

### Ajanda

| Method | Yol | Açıklama |
|---|---|---|
| `GET` | `/api/v1/agenda?from=&to=&type=` | Tarih aralığını gün gün döndürür (en fazla 90 gün) |

Boş günler de döner — takvim arayüzü eksik gün için ayrıca istek atmasın diye.

<details>
<summary>Örnek istek dizisi</summary>

```bash
# 1) Kayıt ol — token'ı sakla
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"cem@test.com","password":"parola1234","name":"Cem"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])')

# 2) Toplantı oluştur
curl -s -X POST http://localhost:3000/api/v1/events \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"meeting","title":"Sprint planlama",
       "startsAt":"2026-09-15T09:00:00Z","endsAt":"2026-09-15T10:00:00Z",
       "participants":["mentor@sirket.com"]}'

# 3) Ajandayı çek
curl -s "http://localhost:3000/api/v1/agenda?from=2026-09-01&to=2026-09-30" \
  -H "Authorization: Bearer $TOKEN"
```

</details>

---

## Yanıt sözleşmesi

Tüm yanıtlar aynı zarfı kullanır. İstemci her endpoint için ayrı bir çözümleme
mantığı yazmak zorunda kalmaz.

**Başarılı — tek kayıt**

```json
{ "data": { "id": "...", "title": "..." } }
```

**Başarılı — liste**

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

**Hata**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Girdi doğrulaması başarısız",
    "details": [{ "field": "title", "message": "Başlık boş olamaz" }]
  }
}
```

| Kod | HTTP | Ne zaman |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod doğrulaması veya iş kuralı ihlali |
| `UNAUTHORIZED` | 401 | Token yok, bozuk ya da süresi dolmuş |
| `NOT_FOUND` | 404 | Kayıt yok — ya da başkasına ait |
| `CONFLICT` | 409 | E-posta zaten kayıtlı, ya da etkinlik saati çakışıyor |
| `INTERNAL_ERROR` | 500 | Beklenmeyen hata |

Başkasının kaydına erişimde bilinçli olarak `403` değil `404` dönülür: kaydın
var olduğu bilgisi bile sızdırılmaz.

---

## İş kuralları

1. Her kayıt bir kullanıcıya aittir; tüm sorgular `userId` ile filtrelenir
2. Parolalar bcrypt ile saklanır, hiçbir yanıtta dönmez
3. Bir etkinlik aynı kullanıcının başka bir etkinliğiyle **saat olarak çakışamaz**
   — sınırlar dışlanır, yani `09:00–10:00` ile `10:00–11:00` ardışıktır
4. Toplantıda en az bir katılımcı zorunlu; kişisel etkinlikte katılımcı listesi kabul edilmez
5. Etkinlik süresi en fazla 24 saat, bitiş başlangıçtan sonra olmalı
6. Görev `done` olunca `completedAt` otomatik dolar, `done`'dan çıkınca silinir
7. Göreve bağlanan not ve etkinlik var olmalı ve aynı kullanıcıya ait olmalı
8. Ajanda sorgusu en fazla 90 gün
9. Sayfa boyutu en fazla 100

---

## Mimari

İstek şu zinciri izler:

```
route → middleware (auth, validate) → controller → service → repository → model
```

Her katmanın tek sorumluluğu var:

| Katman | Sorumluluk |
|---|---|
| **route** | Yol tanımı, hangi middleware'lerin çalışacağı |
| **middleware** | Kimlik doğrulama, girdi doğrulama, hata yakalama, loglama |
| **controller** | HTTP'ye özgü iş: gövdeyi al, servisi çağır, durum kodu seç |
| **service** | İş kuralları — HTTP'yi de veritabanını da bilmez |
| **repository** | Veritabanı sorguları — iş kuralı içermez |
| **model** | Şema, indeksler, alan seviyesi doğrulama |

Bu ayrımın karşılığı test edilebilirlik: servis katmanı HTTP olmadan
çağrılabiliyor, repository değiştirilebiliyor, controller ince kalıyor.

### Klasör düzeni

| Klasör | İçerik |
|---|---|
| `src/config` | Ortam değişkeni doğrulama, logger |
| `src/db` | MongoDB bağlantısı (tekil örnek) |
| `src/models` | Mongoose şemaları ve indeksler |
| `src/schemas` | Zod girdi şemaları |
| `src/repositories` | Veritabanı erişimi |
| `src/services` | İş kuralları |
| `src/controllers` | HTTP katmanı |
| `src/routes` | Yol tanımları |
| `src/middleware` | Auth, doğrulama, hata yakalama, istek logu |
| `src/utils` | JWT, sayfalama, tarih aralığı, hata sınıfları |
| `src/bus` | Olay yayını (Observer) |
| `tests` | Birim ve entegrasyon testleri |

### Kullanılan tasarım desenleri

- **Singleton** — veritabanı bağlantısı tek örnek; her istekte yeni bağlantı açılmaz
- **Repository** — veri erişimi iş mantığından ayrılır
- **Observer** — görev tamamlandığında olay yayınlanır; dinleyici eklemek servisi değiştirmez

Factory ve Strategy bilinçli olarak kullanılmadı: bu ölçekte gereksiz soyutlama olurdu.

---

## Testler

```bash
npm test          # tek sefer çalıştır
npm run test:watch
```

79 test, 8 dosya. Testler gerçek bir MongoDB kullanır (`worklog_test` veritabanı),
mock değil — sınanan davranışların çoğu veritabanına ait: çakışma sorgusu,
`$unset`, benzersizlik indeksi, sahiplik filtresi.

| Klasör | Ne sınar |
|---|---|
| `tests/unit` | Saf fonksiyonlar — tarih aralığı, sayfalama, Zod şeması |
| `tests/integration` | HTTP isteğinden veritabanına kadar tüm zincir |

Test dosyaları sırayla çalışır (`fileParallelism: false`): hepsi aynı
veritabanını kullanıyor ve her testten sonra koleksiyonları temizliyor.

---

## Docker

İki ortam var:

| Dosya | Hedef | Özellikleri |
|---|---|---|
| `docker-compose.yml` | `development` | Kaynak kod bind mount, hot reload, Mongo portu `27018`'de açık |
| `docker-compose.prod.yml` | `production` | Derlenmiş JS, devDependencies yok, non-root kullanıcı, Mongo portu kapalı |

```bash
# Geliştirme
docker compose up -d --build

# Production benzeri
JWT_SECRET=$(openssl rand -base64 48) \
  docker compose -f docker-compose.prod.yml up -d --build
```

Production imajı çok aşamalı build ile üretilir: TypeScript derleyicisi, ESLint
ve test kütüphaneleri imaja hiç girmez. Container `root` olarak çalışmaz ve
`/health` üzerinden `HEALTHCHECK` tanımlıdır.

Yayınlanan imaj:

```bash
docker pull ghcr.io/cemonat00/worklog-api:latest
```

---

## CI/CD

`.github/workflows/ci.yml` iki iş içerir:

**1. Kalite kapısı** — her push ve her PR'da çalışır. Lint, format kontrolü, tip
kontrolü, testler (Mongo servis container'ı ile), derleme ve `npm audit`.
Sıralama bilinçli: hızlı ve ucuz kontroller önde.

**2. Yayın** — yalnızca `main`'e push edildiğinde. Production imajını derleyip
GitHub Container Registry'ye `latest` ve commit sha'sı etiketleriyle gönderir.
Kimlik doğrulama için otomatik üretilen `GITHUB_TOKEN` kullanılır; elle secret
tanımlanmaz.

`main` dalı korumalıdır: doğrudan push kapalı, kalite kapısı yeşil olmadan hiçbir
PR birleşmez.

---

## Proje yönetimi

İş, GitHub Issues üzerinden beş günlük milestone'lara bölünerek yürütüldü. Her
issue kendi dalında geliştirildi, PR ile `main`'e alındı. Commit'ler
[Conventional Commits](https://www.conventionalcommits.org/) biçimindedir.

