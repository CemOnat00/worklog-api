import { Types } from 'mongoose';
import type { EventType, IEvent } from '../models';
import { eventRepository } from '../repositories/event.repository';
import { ConflictError, NotFoundError, ValidationError } from '../utils/httpErrors';
import { buildPageMeta, type PageMeta } from '../utils/pagination';
import { activityBus } from '../bus/activityBus';
import type { CreateEventInput, ListEventsQuery, UpdateEventInput } from '../schemas/event.schema';

export interface EventView {
  id: string;
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

export const eventService = {
  async create(userId: string, input: CreateEventInput): Promise<EventView> {
    await assertNoConflict(userId, input.startsAt, input.endsAt);

    const event = await eventRepository.create({
      ...input,
      userId: new Types.ObjectId(userId),
      participants: input.type === 'meeting' ? input.participants : [],
    });

    activityBus.publish('event.created', {
      userId,
      eventId: event._id.toString(),
      type: event.type,
      title: event.title,
    });

    return event.toJSON() as unknown as EventView;
  },

  async list(
    userId: string,
    query: ListEventsQuery,
  ): Promise<{ data: EventView[]; meta: PageMeta }> {
    const { items, total } = await eventRepository.findMany(userId, query);
    return {
      data: items.map((item) => item.toJSON() as unknown as EventView),
      meta: buildPageMeta(total, query.page, query.limit),
    };
  },

  async getById(userId: string, id: string): Promise<EventView> {
    const event = await eventRepository.findByIdForUser(id, userId);
    if (!event) throw new NotFoundError('Etkinlik');
    return event.toJSON() as unknown as EventView;
  },

  async update(userId: string, id: string, input: UpdateEventInput): Promise<EventView> {
    const current = await eventRepository.findByIdForUser(id, userId);
    if (!current) throw new NotFoundError('Etkinlik');

    // Zaman aralığı kısmi güncellenebilir: sadece endsAt gönderilirse
    // startsAt mevcut kayıttan alınır.
    const startsAt = input.startsAt ?? current.startsAt;
    const endsAt = input.endsAt ?? current.endsAt;

    if (endsAt <= startsAt) {
      throw new ValidationError([
        { field: 'endsAt', message: 'Bitiş zamanı başlangıç zamanından sonra olmalıdır' },
      ]);
    }

    if (input.startsAt || input.endsAt) {
      await assertNoConflict(userId, startsAt, endsAt, id);
    }

    // Tipe bağlı katılımcı kuralı burada uygulanıyor.
    // Zod'un discriminatedUnion'ı güncellemede kullanılamıyor çünkü `type`
    // gönderilmeyebilir; kaydın mevcut tipini bilmek gerekiyor.
    const finalType = input.type ?? current.type;
    const finalParticipants = input.participants ?? current.participants;

    if (finalType === 'meeting' && finalParticipants.length === 0) {
      throw new ValidationError([
        { field: 'participants', message: 'Toplantı için en az bir katılımcı gereklidir' },
      ]);
    }
    if (finalType === 'personal' && finalParticipants.length > 0) {
      throw new ValidationError([
        { field: 'participants', message: 'Kişisel etkinlikte katılımcı listesi kullanılamaz' },
      ]);
    }

    const data: Partial<IEvent> = { ...input };
    // Tip 'personal'a çevrildiyse katılımcılar temizlenir
    if (finalType === 'personal') data.participants = [];

    const event = await eventRepository.updateForUser(id, userId, data);
    if (!event) throw new NotFoundError('Etkinlik');

    return event.toJSON() as unknown as EventView;
  },

  async remove(userId: string, id: string): Promise<void> {
    const event = await eventRepository.deleteForUser(id, userId);
    if (!event) throw new NotFoundError('Etkinlik');
  },
};

/**
 * Kural 3: bir etkinlik, aynı kullanıcının başka bir etkinliğiyle çakışamaz.
 * Çakışan kaydın başlığını ve saatlerini hata detayında döndürüyoruz —
 * kullanıcı neyin engellediğini görsün diye.
 */
async function assertNoConflict(
  userId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
): Promise<void> {
  const conflict = await eventRepository.findConflicting(userId, startsAt, endsAt, excludeId);
  if (!conflict) return;

  throw new ConflictError('Bu saat aralığında başka bir etkinlik var', {
    conflictingEvent: {
      id: conflict._id.toString(),
      title: conflict.title,
      startsAt: conflict.startsAt,
      endsAt: conflict.endsAt,
    },
  });
}
