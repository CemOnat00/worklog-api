import { Schema, Types, model } from 'mongoose';
import { baseSchemaOptions } from './common';

export const EVENT_TYPES = ['meeting', 'personal'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const MAX_PARTICIPANTS = 50;

export interface IEvent {
  userId: Types.ObjectId;
  type: EventType;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    type: {
      type: String,
      enum: {
        values: [...EVENT_TYPES],
        message: 'Etkinlik tipi meeting veya personal olmalıdır',
      },
      required: [true, 'Etkinlik tipi zorunludur'],
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

    startsAt: {
      type: Date,
      required: [true, 'Başlangıç zamanı zorunludur'],
    },

    endsAt: {
      type: Date,
      required: [true, 'Bitiş zamanı zorunludur'],
      validate: {
        validator(this: IEvent, value: Date) {
          return !this.startsAt || value.getTime() > this.startsAt.getTime();
        },
        message: 'Bitiş zamanı başlangıç zamanından sonra olmalıdır',
      },
    },

    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Konum en fazla 200 karakter olabilir'],
    },

    // Tipe bağlı kural (TASARIM.md §4.1):
    //   meeting  -> en az 1 katılımcı zorunlu
    //   personal -> katılımcı listesi boş olmalı
    // Asıl savunma Zod'un discriminatedUnion'ı; bu şema seviyesindeki ikinci katman.
    participants: {
      type: [String],
      default: [] as string[],
      validate: [
        {
          validator(this: IEvent, value: string[]) {
            return this.type !== 'meeting' || value.length >= 1;
          },
          message: 'Toplantı tipinde en az bir katılımcı gereklidir',
        },
        {
          validator(this: IEvent, value: string[]) {
            return this.type !== 'personal' || value.length === 0;
          },
          message: 'Kişisel etkinlikte katılımcı listesi kullanılamaz',
        },
        {
          validator: (value: string[]) => value.length <= MAX_PARTICIPANTS,
          message: `En fazla ${MAX_PARTICIPANTS} katılımcı eklenebilir`,
        },
        {
          validator: (value: string[]) => value.every((p) => p.trim().length > 0),
          message: 'Katılımcı adı boş olamaz',
        },
      ],
    },
  },
  baseSchemaOptions,
);

// Tarih aralığı sorgusu: ajanda ve çakışma kontrolü
eventSchema.index({ userId: 1, startsAt: 1 });

// "Sadece toplantılarımı göster" filtresi
eventSchema.index({ userId: 1, type: 1, startsAt: 1 });

eventSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 3, description: 1 } },
);

export const Event = model<IEvent>('Event', eventSchema);
