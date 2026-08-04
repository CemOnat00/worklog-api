import { EventEmitter } from 'node:events';
import { logger } from '../config/logger';

export type ActivityEvents = {
  'task.completed': { userId: string; taskId: string; title: string };
  'task.created': { userId: string; taskId: string; title: string };
  'event.created': { userId: string; eventId: string; type: string; title: string };
  'note.created': { userId: string; noteId: string; title: string };
};

class ActivityBus extends EventEmitter {
  publish<K extends keyof ActivityEvents>(name: K, payload: ActivityEvents[K]): void {
    this.emit(name, payload);
  }

  subscribe<K extends keyof ActivityEvents>(
    name: K,
    handler: (payload: ActivityEvents[K]) => void,
  ): void {
    this.on(name, handler);
  }
}

export const activityBus = new ActivityBus();

/** Varsayılan dinleyiciler. server.ts açılışta bir kez çağırır. */
export function registerActivityListeners(): void {
  activityBus.subscribe('task.completed', (p) => {
    logger.info({ activity: 'task.completed', ...p }, `Görev tamamlandı: ${p.title}`);
  });

  activityBus.subscribe('task.created', (p) => {
    logger.info({ activity: 'task.created', ...p }, `Görev oluşturuldu: ${p.title}`);
  });

  activityBus.subscribe('event.created', (p) => {
    logger.info({ activity: 'event.created', ...p }, `Etkinlik oluşturuldu: ${p.title}`);
  });

  activityBus.subscribe('note.created', (p) => {
    logger.info({ activity: 'note.created', ...p }, `Not oluşturuldu: ${p.title}`);
  });
}
