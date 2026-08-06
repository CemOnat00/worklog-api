/**
 * Test ortamı değişkenleri.
 *
 * Bu dosya, `src/config/env.ts` import edilmeden ÖNCE çalışmak zorunda —
 * o dosya process.env'i import anında okuyor. `setup.ts` içinde ilk import
 * olarak yer alması bunu garanti ediyor.
 *
 * `||=` kullanılıyor: dışarıdan verilen değer (CI'da MONGO_URI) ezilmez.
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.PORT ||= '3999';
process.env.JWT_SECRET ||= 'test-ortami-icin-sabit-anahtar-en-az-32-karakter';

// Lokalde makinedeki MongoDB, CI'da workflow'un servis container'ı.
// Ayrı veritabanı adı: geliştirme verisi testlerle karışmaz.
process.env.MONGO_URI ||= 'mongodb://127.0.0.1:27017/worklog_test';
