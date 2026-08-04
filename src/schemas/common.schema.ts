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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

/** "2026-08-10" veya tam ISO tarih kabul eder, Date'e çevirir */
export const dateSchema = z.coerce.date({ invalid_type_error: 'Geçerli bir tarih giriniz' });
