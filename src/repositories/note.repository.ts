import type { FilterQuery, Types } from 'mongoose';
import { Note, type INote } from '../models';
import { parseSort, skipFor } from '../utils/pagination';
import type { ListNotesQuery } from '../schemas/note.schema';

/**
 * Repository katmanı — Mongoose sorguları YALNIZCA burada.
 * Service bu fonksiyonları çağırır, sorgu diline hiç dokunmaz.
 */

function buildFilter(userId: string, query: Partial<ListNotesQuery>): FilterQuery<INote> {
  // Her sorgu kullanıcıya kısıtlı başlar. Bu satır sahiplik kontrolünün temeli.
  const filter: FilterQuery<INote> = { userId };

  if (query.tag) filter.tags = query.tag;
  if (query.eventId) filter.eventId = query.eventId;
  if (typeof query.isPinned === 'boolean') filter.isPinned = query.isPinned;
  if (query.q) filter.$text = { $search: query.q };

  return filter;
}

export interface CreateNoteData {
  userId: Types.ObjectId;
  title: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  eventId?: Types.ObjectId;
}

export const noteRepository = {
  create(data: CreateNoteData) {
    return Note.create(data);
  },

  findByIdForUser(id: string, userId: string) {
    return Note.findOne({ _id: id, userId }).exec();
  },

  async existsForUser(id: string, userId: string): Promise<boolean> {
    return (await Note.exists({ _id: id, userId }).exec()) !== null;
  },

  async findMany(userId: string, query: ListNotesQuery) {
    const filter = buildFilter(userId, query);

    // Metin araması varsa alaka düzeyine göre sırala (title ağırlığı 3).
    // Aksi halde kullanıcının istediği alana göre.
    const sort = query.q
      ? { score: { $meta: 'textScore' as const } }
      : parseSort(query.sort ?? '-createdAt');

    const projection = query.q ? { score: { $meta: 'textScore' as const } } : undefined;

    const [items, total] = await Promise.all([
      Note.find(filter, projection)
        .sort(sort)
        .skip(skipFor(query.page, query.limit))
        .limit(query.limit)
        .exec(),
      Note.countDocuments(filter).exec(),
    ]);

    return { items, total };
  },

  /**
   * runValidators + context:'query' olmadan şema doğrulayıcıları
   * findOneAndUpdate'te çalışmaz — Mongoose'un bilinen davranışı.
   */
  updateForUser(id: string, userId: string, data: Partial<INote>) {
    return Note.findOneAndUpdate({ _id: id, userId }, data, {
      new: true,
      runValidators: true,
      context: 'query',
    }).exec();
  },

  deleteForUser(id: string, userId: string) {
    return Note.findOneAndDelete({ _id: id, userId }).exec();
  },
};
