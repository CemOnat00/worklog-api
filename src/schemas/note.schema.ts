import { z } from 'zod';
import { objectIdSchema, paginationSchema } from './common.schema';

const titleField = z
  .string({ required_error: 'Başlık zorunludur' })
  .trim()
  .min(1, 'Başlık boş olamaz')
  .max(200, 'Başlık en fazla 200 karakter olabilir');

const contentField = z.string().trim().max(20000, 'İçerik en fazla 20000 karakter olabilir');

const tagsField = z
  .array(z.string().trim().min(1, 'Etiket boş olamaz').max(30, 'Etiket en fazla 30 karakter'))
  .max(10, 'En fazla 10 etiket eklenebilir');

export const createNoteSchema = z.object({
  title: titleField,
  content: contentField.optional(),
  tags: tagsField.optional(),
  isPinned: z.boolean({ invalid_type_error: 'isPinned true veya false olmalıdır' }).optional(),
  eventId: objectIdSchema.optional(),
});

/**
 * PATCH kısmi güncelleme: tüm alanlar opsiyonel.
 * Ama tamamen boş gövde anlamsızdır — en az bir alan gerekli.
 */
export const updateNoteSchema = createNoteSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Güncellenecek en az bir alan gönderilmelidir',
  });

/**
 * Query string'ten gelen her değer metindir; boolean ve sayıya burada çevrilir.
 * validate middleware'i parse edilmiş sonucu req.query'ye yazdığı için
 * controller tipi garanti edilmiş veriyle çalışır.
 */
export const listNotesQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  eventId: objectIdSchema.optional(),
  isPinned: z
    .enum(['true', 'false'], {
      errorMap: () => ({ message: 'isPinned true veya false olmalıdır' }),
    })
    .transform((value) => value === 'true')
    .optional(),
  sort: z
    .enum(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'title', '-title'], {
      errorMap: () => ({
        message:
          'Sıralama createdAt, -createdAt, updatedAt, -updatedAt, title veya -title olmalıdır',
      }),
    })
    .default('-createdAt'),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
