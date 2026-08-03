import type { Request, Response } from 'express';
import { isDatabaseConnected } from '../db/connection';

const startedAt = Date.now();

/**
 * Liveness — "süreç ayakta mı?"
 * Bilinçli olarak hiçbir bağımlılığı kontrol etmez ve her zaman hızlı döner.
 * Orkestratör bunu görürse container'ı yeniden başlatmaz.
 */
export function live(_req: Request, res: Response): void {
  res.status(200).json({
    data: {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Readiness — "istek almaya hazır mı?"
 * Veritabanı bağlantısını da kontrol eder. DB yoksa 503 döner; böylece
 * yük dengeleyici bu örneğe istek yönlendirmez.
 */
export function ready(_req: Request, res: Response): void {
  const dbConnected = isDatabaseConnected();
  const status = dbConnected ? 200 : 503;

  res.status(status).json({
    data: {
      status: dbConnected ? 'ready' : 'not_ready',
      checks: {
        database: dbConnected ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    },
  });
}
