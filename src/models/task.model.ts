import { Schema, Types, model } from 'mongoose';
import { baseSchemaOptions, tagsField } from './common';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface ITask {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  noteId?: Types.ObjectId;
  eventId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: [true, 'Başlık zorunludur'],
      trim: true,
      minlength: [1, 'Başlık boş olamaz'],
      maxlength: [200, 'Başlık en fazla 200 karakter olabilir'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Açıklama en fazla 5000 karakter olabilir'],
    },

    status: {
      type: String,
      enum: {
        values: [...TASK_STATUSES],
        message: 'Durum todo, in_progress veya done olmalıdır',
      },
      default: 'todo',
    },

    priority: {
      type: String,
      enum: {
        values: [...TASK_PRIORITIES],
        message: 'Öncelik low, medium veya high olmalıdır',
      },
      default: 'medium',
    },

    dueDate: { type: Date },

    // status 'done' olunca service katmanı doldurur, çıkınca temizler.
    completedAt: { type: Date },

    tags: tagsField,

    noteId: {
      type: Schema.Types.ObjectId,
      ref: 'Note',
    },

    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    },
  },
  baseSchemaOptions,
);

// En sık kullanılan filtre kombinasyonu
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });

// Ajanda sorgusu durum filtresi kullanmadan tarih aralığı sorar; yukarıdaki
// index'in ortasındaki `status` bunu karşılamaz, o yüzden ayrı index.
taskSchema.index({ userId: 1, dueDate: 1 }, { sparse: true });

taskSchema.index({ userId: 1, tags: 1 });

taskSchema.index({ title: 'text', description: 'text' }, { weights: { title: 3, description: 1 } });

export const Task = model<ITask>('Task', taskSchema);
