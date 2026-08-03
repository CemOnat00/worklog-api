import 'dotenv/config';
import { z } from 'zod';

/**
 * Ortam değişkeni şeması.
 *
 * Amaç: uygulama AÇILIRKEN yapılandırmayı doğrulamak. Eksik veya hatalı bir
 * değer varsa süreç anlamlı bir mesajla hemen kapanır. Alternatifi, yarım
 * yapılandırmayla ayakta kalıp ilk istekte anlaşılmaz bir hata vermektir.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce
    .number({ invalid_type_error: 'PORT sayı olmalıdır' })
    .int()
    .positive()
    .default(3000),

  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI zorunludur')
    .startsWith('mongodb', 'MONGO_URI "mongodb" ile başlamalıdır'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET en az 32 karakter olmalıdır'),

  JWT_EXPIRES_IN: z.string().default('1d'),

  // 'silent' testlerde log gürültüsünü kapatmak için kullanılır
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Logger burada henüz kurulmadı (logger'ın kendisi env'e bağımlı),
  // bu yüzden bilinçli olarak console.error kullanılıyor.
  console.error('\n[HATA] Ortam degiskenleri gecersiz. Uygulama baslatilamiyor:\n');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\n   .env.example dosyasını kopyalayıp .env oluşturduğundan emin ol:');
  console.error('   cp .env.example .env\n');
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
