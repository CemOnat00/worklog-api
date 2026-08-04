import { Types } from 'mongoose';
import type { INote } from '../models';
import { noteRepository } from '../repositories/note.repository';
import { eventRepository } from '../repositories/event.repository';
import { NotFoundError, ValidationError } from '../utils/httpErrors';
import { buildPageMeta, type PageMeta } from '../utils/pagination';
import { activityBus } from '../bus/activityBus';
import type { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from '../schemas/note.schema';

/**
 * Service katmanı — iş kuralları burada.
 * HTTP'yi ve Mongoose'u bilmez; hata fırlatır, status kodu seçmez.
 */

export interface NoteView {
  id: string;
  title: string;
  content?: string;
  tags: string[];
  isPinned: boolean;
  eventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Kural 7: bağlanan etkinlik var olmalı ve aynı kullanıcıya ait olmalı */
async function assertEventBelongsToUser(eventId: string, userId: string): Promise<void> {
  const exists = await eventRepository.existsForUser(eventId, userId);
  if (!exists) {
    throw new ValidationError([{ field: 'eventId', message: 'Etkinlik bulunamadı' }]);
  }
}

export const noteService = {
  async create(userId: string, input: CreateNoteInput): Promise<NoteView> {
    if (input.eventId) {
      await assertEventBelongsToUser(input.eventId, userId);
    }

    const note = await noteRepository.create({
      ...input,
      userId: new Types.ObjectId(userId),
      eventId: input.eventId ? new Types.ObjectId(input.eventId) : undefined,
    });

    activityBus.publish('note.created', {
      userId,
      noteId: note._id.toString(),
      title: note.title,
    });

    return note.toJSON() as unknown as NoteView;
  },

  async list(userId: string, query: ListNotesQuery): Promise<{ data: NoteView[]; meta: PageMeta }> {
    const { items, total } = await noteRepository.findMany(userId, query);

    return {
      data: items.map((item) => item.toJSON() as unknown as NoteView),
      meta: buildPageMeta(total, query.page, query.limit),
    };
  },

  async getById(userId: string, id: string): Promise<NoteView> {
    const note = await noteRepository.findByIdForUser(id, userId);
    // Başkasının kaydı için de 404 döner, 403 değil.
    // 403 "bu kayıt var ama senin değil" bilgisini sızdırırdı.
    if (!note) throw new NotFoundError('Not');
    return note.toJSON() as unknown as NoteView;
  },

  async update(userId: string, id: string, input: UpdateNoteInput): Promise<NoteView> {
    if (input.eventId) {
      await assertEventBelongsToUser(input.eventId, userId);
    }

    // eventId string olarak geliyor, veritabanı ObjectId bekliyor.
    // Dönüşümü ayırmazsak spread ile string sızıyor.
    const { eventId, ...rest } = input;
    const payload: Partial<INote> = { ...rest };
    if (eventId) payload.eventId = new Types.ObjectId(eventId);

    const note = await noteRepository.updateForUser(id, userId, payload);

    if (!note) throw new NotFoundError('Not');
    return note.toJSON() as unknown as NoteView;
  },

  async remove(userId: string, id: string): Promise<void> {
    const note = await noteRepository.deleteForUser(id, userId);
    if (!note) throw new NotFoundError('Not');
  },
};
