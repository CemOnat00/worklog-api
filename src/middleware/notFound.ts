import type { Request, Response } from 'express';

/**
 * Hiçbir route eşleşmediğinde çalışır.
 * Tanımsız yollar için de aynı hata sözleşmesini korur.
 */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `${req.method} ${req.originalUrl} adresi bulunamadı`,
    },
  });
}
