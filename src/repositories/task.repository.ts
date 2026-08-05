import type { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { Task, type ITask } from '../models';
import { parseSort, skipFor } from '../utils/pagination';
import type { ListTasksQuery } from '../schemas/task.schema';

function buildFilter(userId: string, query: Partial<ListTasksQuery>): FilterQuery<ITask> {
  const filter: FilterQuery<ITask> = { userId };

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.tag) filter.tags = query.tag;
  if (query.noteId) filter.noteId = query.noteId;
  if (query.eventId) filter.eventId = query.eventId;
  if (query.q) filter.$text = { $search: query.q };

  // Tarih aralığı tek alan üzerinde iki koşulla kurulur
  if (query.dueAfter || query.dueBefore) {
    filter.dueDate = {};
    if (query.dueAfter) filter.dueDate.$gte = query.dueAfter;
    if (query.dueBefore) filter.dueDate.$lte = query.dueBefore;
  }

  return filter;
}

export interface CreateTaskData {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  status?: ITask['status'];
  priority?: ITask['priority'];
  dueDate?: Date;
  completedAt?: Date;
  tags?: string[];
  noteId?: Types.ObjectId;
  eventId?: Types.ObjectId;
}

export const taskRepository = {
  create(data: CreateTaskData) {
    return Task.create(data);
  },

  findByIdForUser(id: string, userId: string) {
    return Task.findOne({ _id: id, userId }).exec();
  },

  async findMany(userId: string, query: ListTasksQuery) {
    const filter = buildFilter(userId, query);

    const sort = query.q
      ? { score: { $meta: 'textScore' as const } }
      : parseSort(query.sort ?? '-createdAt');
    const projection = query.q ? { score: { $meta: 'textScore' as const } } : undefined;

    const [items, total] = await Promise.all([
      Task.find(filter, projection)
        .sort(sort)
        .skip(skipFor(query.page, query.limit))
        .limit(query.limit)
        .exec(),
      Task.countDocuments(filter).exec(),
    ]);

    return { items, total };
  },

  /**
   * `unset` parametresi, bir alanı SİLMEK için gerekli.
   * Mongoose `undefined` değerleri güncellemede yok sayar; alanı gerçekten
   * kaldırmak için $unset kullanılmalı. completedAt'i temizlerken bu lazım.
   */
  updateForUser(id: string, userId: string, data: Partial<ITask>, unset: string[] = []) {
    const update: UpdateQuery<ITask> = { $set: data };
    if (unset.length > 0) {
      update.$unset = Object.fromEntries(unset.map((field) => [field, '']));
    }

    return Task.findOneAndUpdate({ _id: id, userId }, update, {
      new: true,
      runValidators: true,
      context: 'query',
    }).exec();
  },

  deleteForUser(id: string, userId: string) {
    return Task.findOneAndDelete({ _id: id, userId }).exec();
  },
};
