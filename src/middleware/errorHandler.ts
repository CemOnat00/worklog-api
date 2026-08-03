import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

/**
 * Tek noktadan hata dönüşümü.
 *
 * Express'te 4 parametreli middleware "error handler" olarak tanınır; bu yüzden
 * kullanılmayan `_next` parametresi silinmemelidir.
 *
 * Buradaki amaç: uygulamanın her yerinden fırlayan farklı hata tiplerini
 * (AppError, ZodError, Mongoose hataları, beklenmeyenler) tek bir yanıt
 * sözleşmesine çevirmek.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Beklenmeyen bir hata oluştu';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Girdi doğrulaması başarısız';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    // Geçersiz ObjectId → kaynak yok gibi davran
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Kayıt bulunamadı';
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Girdi doğrulaması başarısız';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (isDuplicateKeyError(err)) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Bu kayıt zaten mevcut';
  }

  // 5xx beklenmeyen bir durumdur — tam detayıyla log'lanır.
  // 4xx istemci hatasıdır; log'u sadeleştiririz.
  // req.log, requestLogger middleware'i tarafından eklenir ve requestId taşır.
  // Yoksa (örn. middleware'den önce patlayan bir hata) genel logger'a düşeriz.
  const log = req.log ?? logger;

  if (statusCode >= 500) {
    log.error({ err }, 'İşlenmemiş hata');
  } else {
    log.warn({ code, message }, 'İstemci hatası');
  }

  const body: ErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;

  // Stack trace yalnızca production DIŞINDA döner — bilgi sızdırmamak için.
  if (!isProduction && err instanceof Error && statusCode >= 500) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}
