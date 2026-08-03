# worklog-api — Tasarım Dokümanı

**Proje:** Kişisel iş takip, not ve takvim servisi

---

## 1. Problem ve Amaç

Gün içinde üç farklı şeyi takip etmek gerekiyor: yapılacak işler, alınan notlar ve
takvimdeki etkinlikler. Bunlar genelde üç ayrı yerde duruyor ve birbirinden kopuk kalıyor.

`worklog-api`, bu üçünü tek bir veri modelinde birleştiren bir **backend service**'tir.
Kullanıcı arayüzü kapsam dışıdır; servis, bir takvim/görev arayüzünün ihtiyaç duyacağı
tüm veriyi REST API üzerinden sunar.

**Ayırt edici özellik:** `GET /agenda?from=&to=` endpoint'i, verilen tarih aralığındaki
etkinlikleri ve son tarihi olan görevleri birleştirip **gün gün gruplanmış** olarak döner.
Bu, bir takvim ekranının tek istekte ihtiyacı olan her şeyi almasını sağlar.

---

## 2. Kapsam

### Kapsam içi

- Kullanıcı kaydı ve JWT ile kimlik doğrulama
- Not, Görev ve Etkinlik kayıtları için tam CRUD
- Etkinliklerin tipe göre ayrılması (toplantı / kişisel) ve tipe özel doğrulama
- Filtreleme, arama, sıralama ve sayfalama
- Birleşik ajanda (takvim) sorgusu
- Etkinlik saat çakışması kontrolü
- Input validation ve tutarlı hata yanıtları
- Container'da çalışan, env ile yapılandırılan, structured logging yapan servis
- Otomatik test ve CI/CD pipeline

### Kapsam dışı

Bunlar bilinçli olarak kapsam dışında bırakıldı; yapılamadığı için değil, bir haftalık
kapsama sığmadığı veya projenin amacına hizmet etmediği için.

| Konu | Gerekçe |
|---|---|
| Frontend / arayüz | Proje bir backend service olarak tanımlandı |
| Takvim uygulamalarıyla entegrasyon (Google Calendar vb.) | OAuth akışı bir haftalık kapsama sığmaz |
| Tekrarlayan etkinlikler (her salı 10:00) | Recurrence kuralı (RRULE) başlı başına bir konu |
| Bildirim / e-posta gönderimi | Harici servis bağımlılığı, kapsamı şişirir |
| Çok kullanıcılı paylaşım, ekip özellikleri | Yetkilendirme modeli karmaşıklaşır |
| Dosya/görsel yükleme | Storage altyapısı gerektirir |
| Zaman dilimi (timezone) yönetimi | Tüm tarihler UTC olarak saklanır ve döner |

### Stretch goal (yalnızca vakit kalırsa)

- Tek dosyalık statik HTML takvim demo sayfası (sunum amaçlı)

---

## 3. Teknoloji Seçimleri

| Katman | Seçim |
|---|---|
| Runtime | Node.js 24 LTS |
| Dil | TypeScript |
| Web framework | Express |
| Veritabanı | MongoDB |
| ODM | Mongoose |
| Validation | Zod |
| Auth | jsonwebtoken + bcrypt |
| Logging | Pino |
| Test | Vitest + Supertest |
| Lint/Format | ESLint + Prettier |
| Container | Docker (multi-stage) + Compose |
| CI/CD | GitHub Actions + GHCR |

ESLint ve Prettier ayrıca CI'da quality gate olarak kullanılır.

---

## 4. Veri Modeli

### 4.1 Şemalar

**User**

| Alan | Tip | Kural |
|---|---|---|
| `email` | string | zorunlu, benzersiz, küçük harfe çevrilir |
| `passwordHash` | string | zorunlu, sorgularda dönmez (`select: false`) |
| `name` | string | zorunlu, 2–60 karakter |
| `createdAt` / `updatedAt` | Date | otomatik (timestamps) |

**Note**

| Alan | Tip | Kural |
|---|---|---|
| `userId` | ObjectId → User | zorunlu |
| `title` | string | zorunlu, 1–200 karakter |
| `content` | string | opsiyonel, max 20000 karakter |
| `tags` | string[] | opsiyonel, max 10 etiket |
| `isPinned` | boolean | varsayılan `false` |
| `eventId` | ObjectId → Event | opsiyonel — notu bir etkinliğe bağlar |

**Task**

| Alan | Tip | Kural |
|---|---|---|
| `userId` | ObjectId → User | zorunlu |
| `title` | string | zorunlu, 1–200 karakter |
| `description` | string | opsiyonel |
| `status` | enum | `todo` \| `in_progress` \| `done` — varsayılan `todo` |
| `priority` | enum | `low` \| `medium` \| `high` — varsayılan `medium` |
| `dueDate` | Date | opsiyonel — ajandaya bu alan üzerinden girer |
| `completedAt` | Date | `status` `done` olunca servis katmanı doldurur |
| `tags` | string[] | opsiyonel |
| `noteId` | ObjectId → Note | opsiyonel |
| `eventId` | ObjectId → Event | opsiyonel — etkinlikten çıkan aksiyon maddesi |

**Event** (Etkinlik)

| Alan | Tip | Kural |
|---|---|---|
| `userId` | ObjectId → User | zorunlu |
| `type` | enum | **`meeting` \| `personal`** — zorunlu, sonradan değiştirilebilir |
| `title` | string | zorunlu, 1–200 karakter |
| `description` | string | opsiyonel |
| `startsAt` | Date | zorunlu |
| `endsAt` | Date | zorunlu, `startsAt`'tan büyük olmalı |
| `location` | string | opsiyonel |
| `participants` | string[] | **tipe bağlı** — aşağıya bakınız |

#### Tipe göre kurallar (discriminated union)

| Kural | `type: "meeting"` | `type: "personal"` |
|---|---|---|
| `participants` | **zorunlu, en az 1 kişi**, max 50 | gönderilemez (gönderilirse 400) |
| `location` | opsiyonel | opsiyonel |
| Süre üst sınırı | 24 saat | 24 saat |

Bu ayrım Zod'un `discriminatedUnion` yapısıyla kurulur: `type` alanının değeri, hangi
şemanın uygulanacağını belirler. Böylece "toplantı ama katılımcısı yok" veya "kişisel
etkinlik ama katılımcı listesi var" gibi anlamsız kayıtlar veritabanına hiç ulaşmaz.

Mongoose tarafında `participants` alanı ayrıca şema seviyesinde de doğrulanır
(`required` fonksiyonu `type`'a bakar) — Zod uygulama katmanının, Mongoose veri
katmanının savunması olur.

### 4.2 İlişkiler

Tüm ilişkiler **reference** ile kurulur, embedding kullanılmaz. Sebep: bir etkinliğin
notu ondan bağımsız güncellenebilmeli ve tek başına sorgulanabilmeli.

### 4.3 Index'ler

| Collection | Index | Amaç |
|---|---|---|
| `users` | `{ email: 1 }` unique | Giriş sorgusu + tekillik |
| `notes` | `{ userId: 1, createdAt: -1 }` | Kullanıcının notlarını tarihe göre listeleme |
| `notes` | `{ userId: 1, tags: 1 }` | Etikete göre filtreleme |
| `notes` | text index: `title`, `content` | Metin araması (`?q=`) |
| `tasks` | `{ userId: 1, status: 1, dueDate: 1 }` | En sık kullanılan filtre kombinasyonu |
| `events` | `{ userId: 1, startsAt: 1 }` | Tarih aralığı sorgusu (ajanda, çakışma kontrolü) |
| `events` | `{ userId: 1, type: 1, startsAt: 1 }` | "Sadece toplantılarımı göster" filtresi |

**Not:** Her index'in başında `userId` var. Sebep: her sorgu zaten kullanıcıya göre
kısıtlı; compound index'in ilk alanı en seçici filtre olmalı.

---

## 5. API Tasarımı

Taban yol: `/api/v1`

### 5.1 Endpoint Listesi

#### Sağlık

| Metot | Yol | Auth | Açıklama |
|---|---|---|---|
| GET | `/health` | ✗ | Servis ayakta mı (liveness) |
| GET | `/health/ready` | ✗ | DB bağlantısı dahil hazır mı (readiness) |

#### Kimlik doğrulama

| Metot | Yol | Auth | Açıklama |
|---|---|---|---|
| POST | `/api/v1/auth/register` | ✗ | Kayıt → token döner |
| POST | `/api/v1/auth/login` | ✗ | Giriş → token döner |
| GET | `/api/v1/auth/me` | ✓ | Oturumdaki kullanıcı bilgisi |

#### Notlar

| Metot | Yol | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/v1/notes` | ✓ | Listele — `?q=&tag=&isPinned=&eventId=&page=&limit=&sort=` |
| POST | `/api/v1/notes` | ✓ | Oluştur |
| GET | `/api/v1/notes/:id` | ✓ | Tek kayıt |
| PATCH | `/api/v1/notes/:id` | ✓ | Kısmi güncelle |
| DELETE | `/api/v1/notes/:id` | ✓ | Sil |

#### Görevler

| Metot | Yol | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/v1/tasks` | ✓ | Listele — `?status=&priority=&dueBefore=&dueAfter=&tag=&q=&page=&limit=&sort=` |
| POST | `/api/v1/tasks` | ✓ | Oluştur |
| GET | `/api/v1/tasks/:id` | ✓ | Tek kayıt |
| PATCH | `/api/v1/tasks/:id` | ✓ | Kısmi güncelle |
| PATCH | `/api/v1/tasks/:id/status` | ✓ | Sadece durum değiştir (en sık işlem) |
| DELETE | `/api/v1/tasks/:id` | ✓ | Sil |

#### Etkinlikler

| Metot | Yol | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/v1/events` | ✓ | Listele — `?from=&to=&type=&q=&page=&limit=` |
| POST | `/api/v1/events` | ✓ | Oluştur (tipe göre doğrulama + çakışma kontrolü) |
| GET | `/api/v1/events/:id` | ✓ | Tek kayıt |
| PATCH | `/api/v1/events/:id` | ✓ | Kısmi güncelle (çakışma kontrolü tekrar çalışır) |
| DELETE | `/api/v1/events/:id` | ✓ | Sil |

`?type=meeting` ile sadece toplantılar, `?type=personal` ile sadece kişisel etkinlikler
filtrelenir. Parametre verilmezse hepsi döner.

#### Ajanda (takvim)

| Metot | Yol | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/v1/agenda` | ✓ | `?from=&to=&type=` — aralıktaki etkinlikler + tarihli görevler, gün gün gruplu |

### 5.2 Yanıt Sözleşmesi

Tüm endpoint'ler aynı zarfı kullanır. Amaç: istemcinin her yanıtı aynı şekilde
ayrıştırabilmesi.

```jsonc
// Tek kayıt
{ "data": { "id": "...", "title": "..." } }

// Liste
{
  "data": [ /* ... */ ],
  "meta": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
}
```

Tüm hatalar da tek bir yapıdan geçer:

```jsonc
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Girdi doğrulaması başarısız",
    "details": [
      { "field": "participants", "message": "Toplantı için en az bir katılımcı gereklidir" }
    ]
  }
}
```

`details` yalnızca alan bazlı hata varsa döner. `500` durumunda iç detay istemciye
sızdırılmaz, yalnızca log'a yazılır.

### 5.3 Hata Kodları

| HTTP | `code` | Ne zaman |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod şeması geçmedi |
| 401 | `UNAUTHORIZED` | Token yok, geçersiz veya süresi dolmuş |
| 403 | `FORBIDDEN` | Kayıt başkasına ait |
| 404 | `NOT_FOUND` | Kayıt bulunamadı (geçersiz ObjectId dahil) |
| 409 | `CONFLICT` | E-posta zaten kayıtlı / etkinlik saati çakışıyor |
| 500 | `INTERNAL_ERROR` | Beklenmeyen hata |

Bu dönüşüm tek noktada, `errorHandler` middleware'inde yapılır. Service katmanı yalnızca
`AppError` türevi bir hata fırlatır; HTTP kodunu bilmez.

---

## 6. Katmanlı Mimari

```
HTTP isteği
    │
    ▼
┌─────────────────────────────────────────────┐
│  Middleware zinciri                         │
│  requestLogger → auth → validate            │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Route        yol ve metot eşlemesi         │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Controller   HTTP'yi bilir                 │
│  req/res okur, status kodu seçer            │
│  iş kuralı İÇERMEZ                          │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Service      iş kuralları                  │
│  çakışma kontrolü, sahiplik kontrolü,       │
│  completedAt doldurma, event yayınlama      │
│  HTTP'yi ve Mongoose'u BİLMEZ               │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Repository   veri erişimi                  │
│  Mongoose sorguları burada ve sadece burada │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Model        Mongoose şeması               │
└─────────────────────────────────────────────┘
    │
    ▼
  MongoDB
```

**Kural:** Her katman yalnızca bir alttakini tanır. Controller'da Mongoose sorgusu,
service'te `res.status()` görülürse katmanlama bozulmuş demektir.

Hatalar `AppError` sınıfı ile yukarı fırlatılır; en dıştaki `errorHandler` middleware'i
bunları tek noktadan HTTP yanıtına çevirir. Böylece her controller'da `try/catch`
tekrarı olmaz.

### 6.1 Klasör Yapısı

Klasörler **katmana göre** ayrılmıştır. Böylece proje ağacı açıldığında mimari doğrudan
görünür: `controllers/`, `services/`, `repositories/` yan yana durur.

| Klasör | İçerik |
|---|---|
| `config/` | Env doğrulama (Zod), Pino logger |
| `db/` | Mongoose bağlantısı — Singleton |
| `models/` | Mongoose şemaları |
| `repositories/` | Veri erişimi — Mongoose sorguları **yalnızca** burada |
| `services/` | İş kuralları |
| `controllers/` | HTTP req/res |
| `routes/` | Yol tanımları |
| `schemas/` | Zod doğrulama şemaları (`event.schema.ts` içinde `discriminatedUnion`) |
| `middleware/` | auth, validate, requestLogger, errorHandler, notFound |
| `bus/` | Observer (pub/sub) |
| `types/` | Tip genişletmeleri (`req.user`) |
| `utils/` | `AppError`, HTTP hataları, sayfalama, tarih yardımcıları |

Kök seviyede `app.ts` (Express uygulaması) ve `server.ts` (port dinleme, graceful
shutdown) bulunur.

**İki tasarım notu:**

`app.ts` ve `server.ts` ayrı tutuldu. Sebep: testler `app`'i doğrudan Supertest'e
verebilsin, gerçek port açılmasın.

Observer pattern'in klasörü `bus/` olarak adlandırıldı, `events/` değil. Sebep: `Event`
bu projede bir veri modeli (takvim etkinliği); aynı ismi pub/sub altyapısı için de
kullanmak okuyanı yanıltırdı.

---

## 7. Design Pattern Kullanımı

Üç pattern kullanıldı. Her biri somut bir ihtiyaca karşılık geliyor — pattern uğruna
pattern yok.

### 7.1 Singleton — veritabanı bağlantısı

`db/connection.ts` tek bir Mongoose bağlantısı tutar ve tekrar çağrıldığında aynısını
döner.

**Neden:** Her istekte yeni bağlantı açmak connection pool'u tüketir. Tek bağlantının
paylaşılması Mongoose'un kendi pool yönetiminin doğru çalışmasını sağlar.

### 7.2 Repository — veri erişiminin soyutlanması

Her kaynağın bir `*.repository.ts` dosyası var; Mongoose'a ait tek satır kod orada.

**Neden:** Service katmanı `Note.find({...})` yerine `noteRepository.findMany()` çağırır.
İki somut getirisi var: service'i test ederken repository'yi sahte bir nesneyle
değiştirebiliyoruz (veritabanı gerekmiyor), ve ileride ODM değişirse etki tek dosyada
kalıyor.

### 7.3 Observer (pub/sub) — aktivite kaydı

`bus/activityBus.ts` bir `EventEmitter`. Bir görev tamamlandığında veya bir etkinlik
oluşturulduğunda service ilgili olayı yayınlar; dinleyici log'a yazar.

```
task.completed  ·  task.created  ·  event.created  ·  note.created
```

**Neden:** Görev tamamlama akışının "tamamlandığında başka ne olacağı" ile ilgilenmesi
gerekmiyor. İleride bildirim veya istatistik eklenirse yeni bir dinleyici yazılır,
service koduna dokunulmaz.

### Bilinçli olarak kullanılmayanlar

**Factory** ve **Strategy** pattern'leri değerlendirildi ve **eklenmedi**. Bu projede tek
bir veri kaynağı ve tek bir doğrulama stratejisi var; bu pattern'ler yalnızca bir
soyutlama katmanı ekler, karşılığında hiçbir esneklik getirmez. Eklenseydi
over-engineering olurdu.

Bir pattern'i kullanmamak da bir tasarım kararıdır ve gerekçelendirilmesi gerekir.

---

## 8. İş Kuralları

Bunlar **service katmanında** yaşar, controller'da veya model'de değil.

| # | Kural | Nerede |
|---|---|---|
| 1 | Bir kullanıcı yalnızca kendi kayıtlarına erişebilir | tüm service'ler |
| 2 | `endsAt` > `startsAt` olmalı | `event.service` + Zod |
| 3 | Bir etkinlik, aynı kullanıcının başka bir etkinliğiyle saat olarak çakışamaz | `event.service` |
| 4 | Toplantı tipinde en az 1 katılımcı zorunlu | Zod (`discriminatedUnion`) + Mongoose |
| 5 | Kişisel etkinlikte katılımcı listesi kabul edilmez | Zod (`discriminatedUnion`) |
| 6 | Görev `done` olunca `completedAt` otomatik dolar; `done`'dan çıkınca temizlenir | `task.service` |
| 7 | Bir nota/göreve bağlanan `eventId` gerçekten var olmalı ve aynı kullanıcıya ait olmalı | `note.service`, `task.service` |
| 8 | Aynı e-posta ile ikinci kayıt yapılamaz | `auth.service` + unique index |

**Çakışma kontrolü (kural 3) nasıl çalışır:** Yeni etkinliğin `[startsAt, endsAt)`
aralığıyla kesişen bir kayıt var mı diye sorulur. İki aralık şu durumda kesişir:
`mevcut.startsAt < yeni.endsAt` **ve** `mevcut.endsAt > yeni.startsAt`. Güncellemede
kaydın kendisi kontrol dışı bırakılır. Çakışma varsa `409 CONFLICT` döner.

---

## 9. Yapılandırma ve Güvenlik

### Ortam değişkenleri

| Değişken | Örnek | Zorunlu |
|---|---|---|
| `NODE_ENV` | `development` | ✓ |
| `PORT` | `3000` | ✓ |
| `MONGO_URI` | `mongodb://mongo:27017/worklog` | ✓ |
| `JWT_SECRET` | (rastgele, min 32 karakter) | ✓ |
| `JWT_EXPIRES_IN` | `1d` | ✗ (varsayılan `1d`) |
| `LOG_LEVEL` | `info` | ✗ (varsayılan `info`) |

**Config validation:** `config/env.ts` bu değişkenleri uygulama açılışında Zod ile
doğrular. Eksik veya hatalı bir değer varsa uygulama **anlamlı bir hata mesajıyla hemen
kapanır** — yarım yapılandırmayla ayakta kalıp ilk istekte patlamaz.

### Secret yönetimi

- `.env` dosyası `.gitignore` içinde, repoya asla girmez
- `.env.example` yapıyı gösterir, gerçek değer içermez
- CI/CD'de secret'lar GitHub Actions Secrets üzerinden verilir
- Parolalar bcrypt ile hash'lenir; `passwordHash` alanı sorgularda varsayılan olarak dönmez

---

## 10. Gözlemlenebilirlik

- **Structured logging:** Pino ile JSON formatında. Her satırda `level`, `time`, `msg` ve
  varsa `requestId`.
- **Request logging:** Her isteğe bir `requestId` atanır; o isteğin tüm log satırları bu
  id ile ilişkilendirilir. Hata ayıklarken tek bir isteğin izini sürmeyi sağlar.
- **Hassas veri:** Parola ve `Authorization` header'ı log'lardan otomatik olarak
  çıkarılır (Pino `redact`).
- **`/health`:** Süreç ayakta mı — bağımlılık kontrol etmez, hızlı döner.
- **`/health/ready`:** MongoDB bağlantı durumunu da kontrol eder. Compose healthcheck'i
  bunu kullanır.

---

## 11. Test Stratejisi

| Seviye | Kapsam | Araç |
|---|---|---|
| Unit | Service katmanı iş kuralları (bölüm 8'deki tablo) | Vitest + sahte repository |
| Integration | Endpoint'ler uçtan uca (auth, CRUD, validation hataları, ajanda) | Vitest + Supertest + mongodb-memory-server |

Öncelikli test edilecekler: etkinlik çakışma kontrolü, tipe göre katılımcı doğrulaması,
başkasının kaydına erişim denemesi, `/agenda` gün gruplaması.

Hedef %100 kapsama değil, **riskli yolların testli olması**.

---

## 12. Haftalık Plan

| Gün | Çıktı |
|---|---|
| **Pazartesi** | Tasarım dokümanı, issue'lar, repo iskeleti, config + logging + `/health`, Compose ile ayakta ortam |
| **Salı** | Mongoose bağlantısı ve modeller, JWT auth, Notes (referans katmanlı CRUD) |
| **Çarşamba** | Tasks, Events (tip doğrulaması + çakışma kontrolü), `/agenda` |
| **Perşembe** | Testler, multi-stage Dockerfile, CI/CD pipeline, Postman collection |
| **Cuma** | README, son refactor, sunum |


---

## 13. Kabul Kriterleri

Proje şu maddelerin tamamı sağlandığında teslim edilebilir sayılır:

- [ ] `docker compose up` tek komutla API + MongoDB'yi ayağa kaldırıyor
- [ ] `/health` ve `/health/ready` doğru yanıt veriyor
- [ ] Kayıt ol → giriş yap → token ile korumalı endpoint çağır akışı çalışıyor
- [ ] Not, Görev ve Etkinlik için CRUD çalışıyor
- [ ] Toplantı katılımcısız oluşturulamıyor; kişisel etkinliğe katılımcı eklenemiyor
- [ ] Çakışan saatte ikinci etkinlik 409 ile reddediliyor
- [ ] Filtreleme (`?type=`, `?status=`), arama ve sayfalama çalışıyor
- [ ] `/agenda` tarih aralığını gün gün gruplu döndürüyor
- [ ] Hatalı girdi 400 ve anlamlı `details` ile dönüyor; servis çökmüyor
- [ ] Başkasının kaydına erişim 403/404 ile engelleniyor
- [ ] Eksik env ile uygulama açılışta anlamlı hata verip kapanıyor
- [ ] Testler geçiyor
- [ ] GitHub Actions pipeline yeşil, image GHCR'a push ediliyor
- [ ] Postman collection tüm endpoint'leri kapsıyor
- [ ] README ile proje sıfırdan ayağa kaldırılabiliyor
