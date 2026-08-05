import { z } from 'zod';
import { Types } from 'mongoose';

/** Yol parametrelerindeki :id için — geçersiz ObjectId veritabanına hiç gitmez */
export const objectIdSchema = z
  .string()
  .refine((value) => Types.ObjectId.isValid(value), { message: 'Geçersiz kayıt kimliği' });

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export type IdParam = z.infer<typeof idParamSchema>;

/** Tüm listeleme endpoint'lerinin ortak sayfalama parametreleri */
export const paginationSchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'Sayfa numarası sayı olmalıdır' })
    .int('Sayfa numarası tam sayı olmalıdır')
    .min(1, 'Sayfa numarası en az 1 olmalıdır')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Kayıt sayısı sayı olmalıdır' })
    .int('Kayıt sayısı tam sayı olmalıdır')
    .min(1, 'Kayıt sayısı en az 1 olmalıdır')
    .max(100, 'Kayıt sayısı en fazla 100 olabilir')
    .default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * "2026-08-10" veya tam ISO tarih kabul eder, Date'e çevirir.
 *
 * `invalid_type_error` yetmez: `new Date('dun')` bir Date nesnesi üretir ama
 * geçersizdir ve Zod buna kendi İngilizce "Invalid date" mesajını verir.
 * `errorMap` şemanın ürettiği TÜM hata mesajlarını değiştirir.
 */
export function dateField(label: string) {
  return z.coerce.date({
    errorMap: () => ({ message: `${label} geçerli bir tarih olmalıdır` }),
  });
}

export const dateSchema = dateField('Tarih');
