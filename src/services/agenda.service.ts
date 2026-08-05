import { eventRepository } from '../repositories/event.repository';
import { taskRepository } from '../repositories/task.repository';
import { ValidationError } from '../utils/httpErrors';
import {
  daysBetween,
  eachDateKey,
  endOfUtcDay,
  spannedDateKeys,
  startOfUtcDay,
  toDateKey,
} from '../utils/dateRange';
import type { AgendaQuery } from '../schemas/agenda.schema';
import type { EventView } from './event.service';
import type { TaskView } from './task.service';

/**
 * Tek istekte çekilebilecek en uzun aralık.
 * Sınır olmasaydı `?from=1970-01-01&to=2099-12-31` ile tüm veritabanı
 * tek seferde istenebilirdi.
 */
const MAX_RANGE_DAYS = 90;

export interface AgendaDay {
  date: string;
  events: EventView[];
  tasks: TaskView[];
}

export interface AgendaResult {
  data: {
    from: string;
    to: string;
    days: AgendaDay[];
  };
  meta: {
    totalEvents: number;
    totalTasks: number;
    dayCount: number;
  };
}

export const agendaService = {
  async get(userId: string, query: AgendaQuery): Promise<AgendaResult> {
    // `to=2026-08-11` gönderildiğinde o günün tamamı dahil olmalı.
    // Normalleştirmeseydik yalnızca 00:00:00'daki kayıtlar dönerdi.
    const from = startOfUtcDay(query.from);
    const to = endOfUtcDay(query.to);

    const rangeDays = daysBetween(from, to) + 1;
    if (rangeDays > MAX_RANGE_DAYS) {
      throw new ValidationError([
        {
          field: 'to',
          message: `Tarih aralığı en fazla ${MAX_RANGE_DAYS} gün olabilir (istenen: ${rangeDays})`,
        },
      ]);
    }

    // `type` verildiğinde yalnızca o tipteki etkinlikler istenir;
    // görevlerin tipi olmadığı için ajandaya dahil edilmezler.
    const [events, tasks] = await Promise.all([
      eventRepository.findInRange(userId, from, to, query.type),
      query.type ? Promise.resolve([]) : taskRepository.findWithDueDateInRange(userId, from, to),
    ]);

    // Boş günler de dönmeli: takvim arayüzü eksik gün için ayrıca istek atmasın.
    const days = new Map<string, AgendaDay>(
      eachDateKey(from, to).map((date) => [date, { date, events: [], tasks: [] }]),
    );

    for (const event of events) {
      const view = event.toJSON() as unknown as EventView;
      // Bir etkinlik gece yarısını aşabilir (süre üst sınırı 24 saat).
      // Dokunduğu her güne eklenir ki takvimde iki günde de görünsün.
      for (const key of spannedDateKeys(event.startsAt, event.endsAt)) {
        days.get(key)?.events.push(view);
      }
    }

    for (const task of tasks) {
      const view = task.toJSON() as unknown as TaskView;
      if (!task.dueDate) continue;
      days.get(toDateKey(task.dueDate))?.tasks.push(view);
    }

    // Gün içi sıralama: etkinlikler başlangıç saatine göre
    for (const day of days.values()) {
      day.events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    }

    return {
      data: {
        from: toDateKey(from),
        to: toDateKey(to),
        days: [...days.values()],
      },
      meta: {
        // Bir etkinlik birden fazla güne düşebildiği için gün dizilerini
        // toplamak yanlış olurdu; benzersiz kayıt sayısı veriliyor.
        totalEvents: events.length,
        totalTasks: tasks.length,
        dayCount: days.size,
      },
    };
  },
};
