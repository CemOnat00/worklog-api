import { z } from 'zod';
import { EVENT_TYPES } from '../models';
import { dateField } from './common.schema';

export const agendaQuerySchema = z
  .object({
    from: dateField('from'),
    to: dateField('to'),
    type: z
      .enum(EVENT_TYPES, {
        errorMap: () => ({ message: 'Etkinlik tipi meeting veya personal olmalıdır' }),
      })
      .optional(),
  })
  .refine((query) => query.to >= query.from, {
    message: 'to tarihi from tarihinden önce olamaz',
    path: ['to'],
  });

export type AgendaQuery = z.infer<typeof agendaQuerySchema>;
