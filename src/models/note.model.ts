import { Schema, Types, model } from 'mongoose';
import { baseSchemaOptions, tagsField } from './common';

export interface INote {
  userId: Types.ObjectId;
  title: string;
  content?: string;
  tags: string[];
  isPinned: boolean;
  eventId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
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

    content: {
      type: String,
      trim: true,
      maxlength: [20000, 'İçerik en fazla 20000 karakter olabilir'],
    },

    tags: tagsField,

    isPinned: {
      type: Boolean,
      default: false,
    },

    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    },
  },
  baseSchemaOptions,
);

// Kullanıcının notlarını tarihe göre listeleme
noteSchema.index({ userId: 1, createdAt: -1 });

// Etikete göre filtreleme
noteSchema.index({ userId: 1, tags: 1 });

// Metin araması (?q=). weights: başlıktaki eşleşme içerikten daha değerli.
noteSchema.index({ title: 'text', content: 'text' }, { weights: { title: 3, content: 1 } });

export const Note = model<INote>('Note', noteSchema);
