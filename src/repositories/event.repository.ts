import type { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { Event, type IEvent } from '../models';
import { parseSort, skipFor } from '../utils/pagination';
import type { ListEventsQuery } from '../schemas/event.schema';

function buildFilter(userId: string, query: Partial<ListEventsQuery>): FilterQuery<IEvent> {
  const filter: FilterQuery<IEvent> = { userId };

  if (query.type) filter.type = query.type;
  if (query.q) filter.$text = { $search: query.q };

  // Aralıkla KESİŞEN etkinlikler: tamamen içinde olması gerekmiyor.
  // 09:00–10:00 toplantısı, "09:30'dan sonrası" sorgusuna da dahil olmalı.
  if (query.from) filter.endsAt = { $gte: query.from };
  if (query.to) filter.startsAt = { $lte: query.to };

  return filter;
}

export interface CreateEventData {
  userId: Types.ObjectId;
  type: IEvent['type'];
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  participants?: string[];
}

export const eventRepository = {
  create(data: CreateEventData) {
    return Event.create(data);
  },

  findByIdForUser(id: string, userId: string) {
    return Event.findOne({ _id: id, userId }).exec();
  },

  async existsForUser(id: string, userId: string): Promise<boolean> {
    return (await Event.exists({ _id: id, userId }).exec()) !== null;
  },

  async findMany(userId: string, query: ListEventsQuery) {
    const filter = buildFilter(userId, query);

    const sort = query.q
      ? { score: { $meta: 'textScore' as const } }
      : parseSort(query.sort ?? 'startsAt');
    const projection = query.q ? { score: { $meta: 'textScore' as const } } : undefined;

    const [items, total] = await Promise.all([
      Event.find(filter, projection)
        .sort(sort)
        .skip(skipFor(query.page, query.limit))
        .limit(query.limit)
        .exec(),
      Event.countDocuments(filter).exec(),
    ]);

    return { items, total };
  },

  /** Ajanda için: sayfalama yok, aralıktaki her şey zamana göre sıralı */
  findInRange(userId: string, from: Date, to: Date, type?: IEvent['type']) {
    const filter: FilterQuery<IEvent> = {
      userId,
      startsAt: { $lte: to },
      endsAt: { $gte: from },
    };
    if (type) filter.type = type;

    return Event.find(filter).sort({ startsAt: 1 }).exec();
  },

  /**
   * Çakışma kontrolü (TASARIM.md §8, kural 3).
   *
   * İki zaman aralığı şu durumda kesişir:
   *   mevcut.startsAt < yeni.endsAt   VE   mevcut.endsAt > yeni.startsAt
   *
   * Sınırlar dışlanır: 09:00–10:00 ile 10:00–11:00 çakışmaz, ardışıktır.
   * `excludeId` güncellemede kaydın kendisiyle çakışmasını engeller.
   */
  findConflicting(userId: string, startsAt: Date, endsAt: Date, excludeId?: string) {
    const filter: FilterQuery<IEvent> = {
      userId,
      startsAt: { $lt: endsAt },
      endsAt: { $gt: startsAt },
    };
    if (excludeId) filter._id = { $ne: excludeId };

    return Event.findOne(filter).exec();
  },

  updateForUser(id: string, userId: string, data: Partial<IEvent>, unset: string[] = []) {
    const update: UpdateQuery<IEvent> = { $set: data };
    if (unset.length > 0) {
      update.$unset = Object.fromEntries(unset.map((field) => [field, '']));
    }

    return Event.findOneAndUpdate({ _id: id, userId }, update, {
      new: true,
      runValidators: true,
      context: 'query',
    }).exec();
  },

  deleteForUser(id: string, userId: string) {
    return Event.findOneAndDelete({ _id: id, userId }).exec();
  },
};
