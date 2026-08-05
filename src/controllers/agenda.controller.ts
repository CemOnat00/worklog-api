import type { Request, Response } from 'express';
import { agendaService } from '../services/agenda.service';
import { currentUserId } from '../middleware/auth';
import type { AgendaQuery } from '../schemas/agenda.schema';

export async function get(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AgendaQuery;
  const result = await agendaService.get(currentUserId(req), query);
  res.status(200).json(result);
}
