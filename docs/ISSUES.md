# GitHub Issue Listesi

Aşağıdaki 18 issue GitHub'da açılacak. Her issue bir branch'e, her branch bir PR'a
karşılık gelir. Bir issue'yu bitirmeden diğerine geçilmez.

**Branch adlandırma:** `feat/3-config-logging`, `fix/12-agenda-timezone` gibi —
`<tip>/<issue-no>-<kısa-açıklama>`.

**PR kapatma:** PR açıklamasına `Closes #3` yazılırsa merge edilince issue otomatik kapanır.

---

## Milestone 1 — Pazartesi: Temel

### #1 Tasarım dokümanı hazırla
**Etiket:** `docs`
Veri modeli, endpoint listesi, katmanlı mimari, teknoloji seçimleri ve gerekçeleri.

- [x] `docs/TASARIM.md` yazıldı
- [x] Kapsam içi / kapsam dışı netleştirildi
- [x] İş kuralları listelendi

---

### #2 Proje iskeleti ve geliştirme araçları
**Etiket:** `chore`
TypeScript, ESLint, Prettier ve klasör yapısı.

- [x] `package.json`, `tsconfig.json`
- [x] ESLint + Prettier yapılandırması
- [x] Katmanlı klasör yapısı (`routes/`, `controllers/`, `services/`, `repositories/`, `models/`)
- [x] `.gitignore`

**Kabul:** `npm run typecheck`, `npm run lint`, `npm run format:check` hatasız geçiyor.

---

### #3 Ortam değişkeni doğrulaması ve structured logging
**Etiket:** `feat`
Uygulama açılışta yapılandırmayı doğrulasın; log'lar JSON ve requestId'li olsun.

- [x] Zod ile `config/env.ts`
- [x] Eksik/hatalı env'de anlamlı mesajla `process.exit(1)`
- [x] `.env.example`
- [x] Pino logger + hassas alan `redact`
- [x] `requestId` üreten request logger

**Kabul:** `JWT_SECRET` silinip başlatıldığında uygulama açıklayıcı hata verip kapanıyor.

---

### #4 Health endpoint'leri
**Etiket:** `feat`

- [x] `GET /health` — liveness, bağımlılık kontrol etmez
- [x] `GET /health/ready` — DB bağlantısını kontrol eder, yoksa 503

**Kabul:** DB kapalıyken `/health` 200, `/health/ready` 503 dönüyor.

---

### #5 Merkezi hata yönetimi
**Etiket:** `feat`

- [x] `AppError` taban sınıfı ve türevleri (`NotFoundError`, `ConflictError`, ...)
- [x] `errorHandler` middleware — AppError / ZodError / Mongoose hatalarını tek sözleşmeye çevirir
- [x] `notFound` middleware
- [x] `asyncHandler` sarmalayıcı

**Kabul:** Tanımsız bir yola istek atınca `{ error: { code, message } }` sözleşmesiyle 404 dönüyor.

---

### #6 Docker Compose ile geliştirme ortamı
**Etiket:** `chore`

- [x] `Dockerfile` (multi-stage, `development` + `production` hedefleri)
- [x] `docker-compose.yml` — api + mongo, named volume, healthcheck, `depends_on`
- [x] `.dockerignore`

**Kabul:** `docker compose up --build` sonrası `curl localhost:3000/health` 200 dönüyor.

---

## Milestone 2 — Salı: Veri ve Kimlik

### #7 Mongoose bağlantısı (Singleton) ve modeller
**Etiket:** `feat`

- [ ] `db/connection.ts` — tek bağlantı, tekrar çağrıda aynısını döner
- [ ] `user.model.ts`, `note.model.ts`, `task.model.ts`, `event.model.ts`
- [ ] TASARIM.md 4.3'teki index'ler tanımlandı
- [ ] `Event.participants` için tipe bağlı `required` kuralı

**Kabul:** Uygulama açıldığında index'ler oluşuyor; `mongosh` ile `getIndexes()` doğrulanıyor.

---

### #8 JWT kimlik doğrulama
**Etiket:** `feat`

- [ ] `POST /api/v1/auth/register` — bcrypt ile hash, token döner
- [ ] `POST /api/v1/auth/login`
- [ ] `GET /api/v1/auth/me`
- [ ] `auth` middleware — token doğrular, `req.user` doldurur
- [ ] Aynı e-posta ile ikinci kayıt 409 döner

**Kabul:** Token'sız korumalı endpoint 401; geçersiz token 401; geçerli token 200.

---

### #9 Notes CRUD (referans modül)
**Etiket:** `feat`
Bu modül katman kalıbını belirler; diğerleri bunu örnek alır.

- [ ] `note.model` → `note.repository` → `note.service` → `note.controller` → `note.routes`
- [ ] Zod şemaları (`create`, `update`, `list` query)
- [ ] `GET /notes` — `?q=&tag=&isPinned=&page=&limit=&sort=`
- [ ] Sahiplik kontrolü: başkasının notu 404

**Kabul:** Beş endpoint de çalışıyor; Postman'den doğrulandı.

---

## Milestone 3 — Çarşamba: İş Mantığı

### #10 Tasks CRUD ve filtreleme
**Etiket:** `feat`

- [ ] Tam katmanlı CRUD
- [ ] `GET /tasks` — `?status=&priority=&dueBefore=&dueAfter=&tag=&q=&page=&sort=`
- [ ] `PATCH /tasks/:id/status`
- [ ] `status: done` olunca `completedAt` dolar, çıkınca temizlenir

**Kabul:** Filtre kombinasyonları doğru sonuç veriyor; sayfalama `meta` bilgisi doğru.

---

### #11 Events CRUD, tip doğrulaması ve çakışma kontrolü
**Etiket:** `feat`

- [ ] Tam katmanlı CRUD
- [ ] Zod `discriminatedUnion`: `type: "meeting" | "personal"`
- [ ] Toplantıda en az 1 katılımcı zorunlu
- [ ] Kişisel etkinlikte katılımcı gönderilirse 400
- [ ] `endsAt > startsAt` kuralı
- [ ] Çakışan saatte ikinci etkinlik 409
- [ ] `GET /events?type=&from=&to=`

**Kabul:** TASARIM.md 5.4'teki üç örnek isteğin üçü de beklenen yanıtı veriyor.

---

### #12 Agenda (takvim) endpoint'i
**Etiket:** `feat`

- [ ] `GET /agenda?from=&to=&type=`
- [ ] Etkinlikler + `dueDate`'i olan görevler birleşik
- [ ] Gün gün gruplanmış, boş günler dahil
- [ ] Gün içinde `startsAt`'a göre sıralı
- [ ] Aralık üst sınırı (örn. 90 gün) — aşılırsa 400

**Kabul:** İki günlük aralıkta TASARIM.md 5.5'teki yapıda yanıt dönüyor.

---

### #13 Observer ile aktivite kaydı
**Etiket:** `feat`

- [ ] `bus/activityBus.ts` dinleyicileri
- [ ] `task.completed`, `task.created`, `event.created`, `note.created` yayınları
- [ ] Service katmanı bu olayları yayınlıyor

**Kabul:** Bir görev `done` yapıldığında log'da `activity: task.completed` satırı görünüyor.

---

## Milestone 4 — Perşembe: Kalite ve Teslim

### #14 Otomatik testler
**Etiket:** `test`

- [ ] Vitest + Supertest + mongodb-memory-server kurulumu
- [ ] Unit: etkinlik çakışma kontrolü, `completedAt` mantığı, sahiplik kontrolü
- [ ] Integration: auth akışı, her kaynak için CRUD, validation hataları, `/agenda`
- [ ] `npm test` yerelde geçiyor

**Kabul:** Tüm testler yeşil; kritik iş kuralları kapsanmış.

---

### #15 Production Dockerfile ve image optimizasyonu
**Etiket:** `chore`

- [ ] Multi-stage build doğrulandı
- [ ] Non-root kullanıcı
- [ ] `HEALTHCHECK`
- [ ] Image boyutu ölçüldü ve README'ye yazıldı

**Kabul:** `docker build --target production` çalışıyor, container `/health` 200 dönüyor.

---

### #16 GitHub Actions CI/CD pipeline
**Etiket:** `ci`

- [ ] PR ve push'ta: checkout → setup-node (cache) → install → lint → typecheck → test → build
- [ ] Sadece `main`'de: image build + GHCR push
- [ ] Secret'lar GitHub Secrets üzerinden
- [ ] README'ye status badge

**Kabul:** Pipeline yeşil; GHCR'da image görünüyor.

---

### #17 Postman collection
**Etiket:** `docs`

- [ ] Tüm endpoint'ler için istek
- [ ] Environment dosyası (`baseUrl`, `token`)
- [ ] Login sonrası token'ı otomatik değişkene yazan test script'i
- [ ] Hatalı girdi örnekleri (400, 401, 409)

**Kabul:** Collection import edilip baştan sona çalıştırılabiliyor.

---

### #18 README ve son temizlik
**Etiket:** `docs`

- [ ] Kurulum (Docker'lı ve Docker'sız)
- [ ] Çalıştırma komutları
- [ ] Endpoint tablosu
- [ ] Mimari açıklaması ve klasör yapısı
- [ ] Ortam değişkenleri tablosu
- [ ] Kullanılmayan kod ve TODO temizliği

**Kabul:** Projeyi hiç görmemiş biri sadece README ile ayağa kaldırabiliyor.

---

## Stretch (yalnızca vakit kalırsa)

### #19 HTML takvim demo sayfası
**Etiket:** `enhancement`
Tek dosyalık statik sayfa; `/agenda`'yı çağırıp ayı çizer, güne tıklayınca etkinlik ekler.
Sunum amaçlıdır, kapsam dışıdır.
