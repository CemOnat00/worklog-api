import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../models';
import { dateField, objectIdSchema, paginationSchema } from './common.schema';

/**
 * Enum değerleri modelden geliyor — tek kaynak.
 * Modele yeni bir durum eklenirse Zod şeması kendiliğinden güncellenir.
 */
const statusField = z.enum(TASK_STATUSES, {
  errorMap: () => ({ message: 'Durum todo, in_progress veya done olmalıdır' }),
});

const priorityField = z.enum(TASK_PRIORITIES, {
  errorMap: () => ({ message: 'Öncelik low, medium veya high olmalıdır' }),
});

const titleField = z
  .string({ required_error: 'Başlık zorunludur' })
  .trim()
  .min(1, 'Başlık boş olamaz')
  .max(200, 'Başlık en fazla 200 karakter olabilir');

const tagsField = z
  .array(z.string().trim().min(1, 'Etiket boş olamaz').max(30, 'Etiket en fazla 30 karakter'))
  .max(10, 'En fazla 10 etiket eklenebilir');

export const createTaskSchema = z.object({
  title: titleField,
  description: z.string().trim().max(5000, 'Açıklama en fazla 5000 karakter').optional(),
  status: statusField.optional(),
  priority: priorityField.optional(),
  dueDate: dateField('Son tarih').optional(),
  tags: tagsField.optional(),
  noteId: objectIdSchema.optional(),
  eventId: objectIdSchema.optional(),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Güncellenecek en az bir alan gönderilmelidir',
  });

/** PATCH /tasks/:id/status — en sık yapılan işlem, ayrı endpoint */
export const updateTaskStatusSchema = z.object({
  status: statusField,
});

export const listTasksQuerySchema = paginationSchema.extend({
  status: statusField.optional(),
  priority: priorityField.optional(),
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  noteId: objectIdSchema.optional(),
  eventId: objectIdSchema.optional(),
  dueBefore: dateField('dueBefore').optional(),
  dueAfter: dateField('dueAfter').optional(),
  sort: z
    .enum(
      [
        'createdAt',
        '-createdAt',
        'updatedAt',
        '-updatedAt',
        'dueDate',
        '-dueDate',
        'priority',
        '-priority',
        'title',
        '-title',
      ],
      {
        errorMap: () => ({
          message: 'Sıralama createdAt, updatedAt, dueDate, priority veya title olmalıdır',
        }),
      },
    )
    .default('-createdAt'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
