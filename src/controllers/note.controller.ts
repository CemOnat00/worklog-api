import type { Request, Response } from 'express';
import { noteService } from '../services/note.service';
import { currentUserId } from '../middleware/auth';
import type { ListNotesQuery } from '../schemas/note.schema';

export async function create(req: Request, res: Response): Promise<void> {
  const note = await noteService.create(currentUserId(req), req.body);
  res.status(201).json({ data: note });
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListNotesQuery;
  const { data, meta } = await noteService.list(currentUserId(req), query);
  res.status(200).json({ data, meta });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const note = await noteService.getById(currentUserId(req), req.params.id);
  res.status(200).json({ data: note });
}

export async function update(req: Request, res: Response): Promise<void> {
  const note = await noteService.update(currentUserId(req), req.params.id, req.body);
  res.status(200).json({ data: note });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await noteService.remove(currentUserId(req), req.params.id);
  res.status(204).send();
}
