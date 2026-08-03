import { AppError } from './AppError';

/** 400 — girdi doğrulaması başarısız */
export class ValidationError extends AppError {
  constructor(details?: unknown, message = 'Girdi doğrulaması başarısız') {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/** 401 — kimlik doğrulanamadı (token yok / geçersiz / süresi dolmuş) */
export class UnauthorizedError extends AppError {
  constructor(message = 'Kimlik doğrulaması gerekli') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/** 403 — kimlik doğrulandı ama bu kayda erişim yetkisi yok */
export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz yok') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** 404 — kayıt bulunamadı */
export class NotFoundError extends AppError {
  constructor(resource = 'Kayıt') {
    super(`${resource} bulunamadı`, 404, 'NOT_FOUND');
  }
}

/** 409 — mevcut durumla çelişki (tekrar eden e-posta, çakışan saat...) */
export class ConflictError extends AppError {
  constructor(message = 'İstek mevcut durumla çelişiyor', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}
