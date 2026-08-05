import type { Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { currentUserId } from '../middleware/auth';
import type { ListEventsQuery } from '../schemas/event.schema';

export async function create(req: Request, res: Response): Promise<void> {
  const event = await eventService.create(currentUserId(req), req.body);
  res.status(201).json({ data: event });
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListEventsQuery;
  const { data, meta } = await eventService.list(currentUserId(req), query);
  res.status(200).json({ data, meta });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const event = await eventService.getById(currentUserId(req), req.params.id);
  res.status(200).json({ data: event });
}

export async function update(req: Request, res: Response): Promise<void> {
  const event = await eventService.update(currentUserId(req), req.params.id, req.body);
  res.status(200).json({ data: event });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await eventService.remove(currentUserId(req), req.params.id);
  res.status(204).send();
}
