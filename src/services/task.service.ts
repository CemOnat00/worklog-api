import { Types } from 'mongoose';
import type { ITask, TaskStatus } from '../models';
import { taskRepository } from '../repositories/task.repository';
import { noteRepository } from '../repositories/note.repository';
import { eventRepository } from '../repositories/event.repository';
import { NotFoundError, ValidationError } from '../utils/httpErrors';
import { buildPageMeta, type PageMeta } from '../utils/pagination';
import { activityBus } from '../bus/activityBus';
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from '../schemas/task.schema';

export interface TaskView {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: ITask['priority'];
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  noteId?: string;
  eventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Kural 7: bağlanan not ve etkinlik var olmalı ve aynı kullanıcıya ait olmalı */
async function assertLinksBelongToUser(
  userId: string,
  links: { noteId?: string; eventId?: string },
): Promise<void> {
  if (links.noteId && !(await noteRepository.existsForUser(links.noteId, userId))) {
    throw new ValidationError([{ field: 'noteId', message: 'Not bulunamadı' }]);
  }
  if (links.eventId && !(await eventRepository.existsForUser(links.eventId, userId))) {
    throw new ValidationError([{ field: 'eventId', message: 'Etkinlik bulunamadı' }]);
  }
}

export const taskService = {
  async create(userId: string, input: CreateTaskInput): Promise<TaskView> {
    await assertLinksBelongToUser(userId, input);

    const task = await taskRepository.create({
      ...input,
      userId: new Types.ObjectId(userId),
      noteId: input.noteId ? new Types.ObjectId(input.noteId) : undefined,
      eventId: input.eventId ? new Types.ObjectId(input.eventId) : undefined,
      // Kural 6: doğrudan 'done' olarak oluşturulduysa completedAt hemen dolar
      completedAt: input.status === 'done' ? new Date() : undefined,
    });

    activityBus.publish('task.created', {
      userId,
      taskId: task._id.toString(),
      title: task.title,
    });

    if (task.status === 'done') {
      activityBus.publish('task.completed', {
        userId,
        taskId: task._id.toString(),
        title: task.title,
      });
    }

    return task.toJSON() as unknown as TaskView;
  },

  async list(userId: string, query: ListTasksQuery): Promise<{ data: TaskView[]; meta: PageMeta }> {
    const { items, total } = await taskRepository.findMany(userId, query);
    return {
      data: items.map((item) => item.toJSON() as unknown as TaskView),
      meta: buildPageMeta(total, query.page, query.limit),
    };
  },

  async getById(userId: string, id: string): Promise<TaskView> {
    const task = await taskRepository.findByIdForUser(id, userId);
    if (!task) throw new NotFoundError('Görev');
    return task.toJSON() as unknown as TaskView;
  },

  async update(userId: string, id: string, input: UpdateTaskInput): Promise<TaskView> {
    await assertLinksBelongToUser(userId, input);

    const current = await taskRepository.findByIdForUser(id, userId);
    if (!current) throw new NotFoundError('Görev');

    const { noteId, eventId, status, ...rest } = input;
    const data: Partial<ITask> = { ...rest };
    const unset: string[] = [];

    if (noteId) data.noteId = new Types.ObjectId(noteId);
    if (eventId) data.eventId = new Types.ObjectId(eventId);

    if (status) {
      data.status = status;
      applyCompletedAt(data, unset, status, current.status, current.completedAt);
    }

    const task = await taskRepository.updateForUser(id, userId, data, unset);
    if (!task) throw new NotFoundError('Görev');

    publishIfCompleted(userId, task, current.status);

    return task.toJSON() as unknown as TaskView;
  },

  /** Sadece durum değiştirir — en sık yapılan işlem olduğu için ayrı endpoint */
  async updateStatus(userId: string, id: string, input: UpdateTaskStatusInput): Promise<TaskView> {
    const current = await taskRepository.findByIdForUser(id, userId);
    if (!current) throw new NotFoundError('Görev');

    const data: Partial<ITask> = { status: input.status };
    const unset: string[] = [];
    applyCompletedAt(data, unset, input.status, current.status, current.completedAt);

    const task = await taskRepository.updateForUser(id, userId, data, unset);
    if (!task) throw new NotFoundError('Görev');

    publishIfCompleted(userId, task, current.status);

    return task.toJSON() as unknown as TaskView;
  },

  async remove(userId: string, id: string): Promise<void> {
    const task = await taskRepository.deleteForUser(id, userId);
    if (!task) throw new NotFoundError('Görev');
  },
};

/**
 * Kural 6: status 'done' olunca completedAt dolar, 'done'dan çıkınca temizlenir.
 * Zaten 'done' olan bir görev tekrar 'done' yapılırsa ilk tamamlanma zamanı korunur.
 */
function applyCompletedAt(
  data: Partial<ITask>,
  unset: string[],
  newStatus: TaskStatus,
  previousStatus: TaskStatus,
  previousCompletedAt?: Date,
): void {
  if (newStatus === 'done') {
    data.completedAt =
      previousStatus === 'done' && previousCompletedAt ? previousCompletedAt : new Date();
    return;
  }
  // 'done' değilse alan tamamen kaldırılır ($unset)
  unset.push('completedAt');
}

function publishIfCompleted(
  userId: string,
  task: { _id: Types.ObjectId; status: TaskStatus; title: string },
  previousStatus: TaskStatus,
): void {
  if (task.status === 'done' && previousStatus !== 'done') {
    activityBus.publish('task.completed', {
      userId,
      taskId: task._id.toString(),
      title: task.title,
    });
  }
}
