import type { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { currentUserId } from '../middleware/auth';

/**
 * Controller katmanı: HTTP'yi bilir, iş kuralı içermez.
 * Sadece isteği okur, servisi çağırır, status kodunu seçer.
 */

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  res.status(201).json({ data: result });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  res.status(200).json({ data: result });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getById(currentUserId(req));
  res.status(200).json({ data: user });
}
