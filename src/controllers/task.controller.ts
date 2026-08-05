import type { Request, Response } from 'express';
import { taskService } from '../services/task.service';
import { currentUserId } from '../middleware/auth';
import type { ListTasksQuery } from '../schemas/task.schema';

export async function create(req: Request, res: Response): Promise<void> {
  const task = await taskService.create(currentUserId(req), req.body);
  res.status(201).json({ data: task });
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListTasksQuery;
  const { data, meta } = await taskService.list(currentUserId(req), query);
  res.status(200).json({ data, meta });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const task = await taskService.getById(currentUserId(req), req.params.id);
  res.status(200).json({ data: task });
}

export async function update(req: Request, res: Response): Promise<void> {
  const task = await taskService.update(currentUserId(req), req.params.id, req.body);
  res.status(200).json({ data: task });
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const task = await taskService.updateStatus(currentUserId(req), req.params.id, req.body);
  res.status(200).json({ data: task });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await taskService.remove(currentUserId(req), req.params.id);
  res.status(204).send();
}
