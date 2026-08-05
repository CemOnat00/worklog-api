import { z } from 'zod';
import { EVENT_TYPES, MAX_PARTICIPANTS } from '../models';
import { dateField, paginationSchema } from './common.schema';

const MAX_DURATION_HOURS = 24;

const titleField = z
  .string({ required_error: 'Başlık zorunludur' })
  .trim()
  .min(1, 'Başlık boş olamaz')
  .max(200, 'Başlık en fazla 200 karakter olabilir');

const participantItem = z
  .string()
  .trim()
  .min(1, 'Katılımcı adı boş olamaz')
  .max(120, 'Katılımcı adı en fazla 120 karakter olabilir');

const participantsField = z
  .array(participantItem, { invalid_type_error: 'Katılımcı listesi bir dizi olmalıdır' })
  .max(MAX_PARTICIPANTS, `En fazla ${MAX_PARTICIPANTS} katılımcı eklenebilir`);

/**
 * Toplantıda katılımcı alanı hiç gönderilmezse Zod'un `required_error`'ı devreye
 * girer; boş dizi gönderilirse `.min(1)` mesajı. İkisi de aynı metni vermeli,
 * yoksa biri Türkçe biri İngilizce dönerdi.
 */
const requiredParticipantsField = z
  .array(participantItem, {
    required_error: 'Toplantı için en az bir katılımcı gereklidir',
    invalid_type_error: 'Katılımcı listesi bir dizi olmalıdır',
  })
  .min(1, 'Toplantı için en az bir katılımcı gereklidir')
  .max(MAX_PARTICIPANTS, `En fazla ${MAX_PARTICIPANTS} katılımcı eklenebilir`);

/** Her iki etkinlik tipinde de ortak olan alanlar */
const baseEventFields = {
  title: titleField,
  description: z.string().trim().max(5000, 'Açıklama en fazla 5000 karakter').optional(),
  startsAt: dateField('Başlangıç zamanı'),
  endsAt: dateField('Bitiş zamanı'),
  location: z.string().trim().max(200, 'Konum en fazla 200 karakter olabilir').optional(),
};

/**
 * Toplantı: katılımcı ZORUNLU, en az bir kişi.
 */
const meetingSchema = z.object({
  type: z.literal('meeting'),
  ...baseEventFields,
  participants: requiredParticipantsField,
});

/**
 * Kişisel etkinlik: katılımcı alanı hiç gönderilemez.
 * `z.undefined()` gönderilirse hata verir; boş dizi bile kabul edilmez.
 */
const personalSchema = z.object({
  type: z.literal('personal'),
  ...baseEventFields,
  participants: z
    .undefined({ invalid_type_error: 'Kişisel etkinlikte katılımcı listesi kullanılamaz' })
    .optional(),
});

/**
 * discriminatedUnion: `type` alanının değeri hangi şemanın uygulanacağını belirler.
 *
 * Normal `union` ile de yazılabilirdi ama hata mesajları anlamsız olurdu — Zod
 * her iki şemayı da deneyip ikisinin de hatalarını dökerdi. discriminatedUnion
 * önce `type`'a bakıp doğru şemayı seçiyor, hata mesajı tek ve net oluyor.
 */
export const createEventSchema = z
  .discriminatedUnion('type', [meetingSchema, personalSchema], {
    errorMap: (issue) => {
      if (issue.code === 'invalid_union_discriminator') {
        return { message: 'Etkinlik tipi meeting veya personal olmalıdır' };
      }
      return { message: issue.message ?? 'Geçersiz değer' };
    },
  })
  .superRefine(assertValidTimeRange);

/**
 * Güncellemede tüm alanlar opsiyonel olduğu için discriminatedUnion kullanılamaz —
 * `type` gönderilmeyebilir. Tipe bağlı kural bu yüzden service katmanında,
 * kaydın mevcut tipi bilindikten sonra uygulanıyor.
 */
export const updateEventSchema = z
  .object({
    type: z
      .enum(EVENT_TYPES, {
        errorMap: () => ({ message: 'Etkinlik tipi meeting veya personal olmalıdır' }),
      })
      .optional(),
    title: titleField.optional(),
    description: baseEventFields.description,
    startsAt: dateField('Başlangıç zamanı').optional(),
    endsAt: dateField('Bitiş zamanı').optional(),
    location: baseEventFields.location,
    participants: participantsField.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Güncellenecek en az bir alan gönderilmelidir',
  })
  .superRefine((body, ctx) => {
    if (body.startsAt && body.endsAt) {
      assertValidTimeRange({ startsAt: body.startsAt, endsAt: body.endsAt }, ctx);
    }
  });

export const listEventsQuerySchema = paginationSchema
  .extend({
    type: z
      .enum(EVENT_TYPES, {
        errorMap: () => ({ message: 'Etkinlik tipi meeting veya personal olmalıdır' }),
      })
      .optional(),
    q: z.string().trim().min(1).optional(),
    from: dateField('from').optional(),
    to: dateField('to').optional(),
    sort: z
      .enum(['startsAt', '-startsAt', 'createdAt', '-createdAt', 'title', '-title'], {
        errorMap: () => ({ message: 'Sıralama startsAt, createdAt veya title olmalıdır' }),
      })
      .default('startsAt'),
  })
  .refine((query) => !query.from || !query.to || query.to >= query.from, {
    message: 'to tarihi from tarihinden önce olamaz',
    path: ['to'],
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

/** endsAt > startsAt ve süre üst sınırı — iki şemada da kullanılıyor */
function assertValidTimeRange(value: { startsAt: Date; endsAt: Date }, ctx: z.RefinementCtx): void {
  if (value.endsAt <= value.startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'Bitiş zamanı başlangıç zamanından sonra olmalıdır',
    });
    return;
  }

  const durationHours = (value.endsAt.getTime() - value.startsAt.getTime()) / 3_600_000;
  if (durationHours > MAX_DURATION_HOURS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: `Etkinlik süresi en fazla ${MAX_DURATION_HOURS} saat olabilir`,
    });
  }
}
