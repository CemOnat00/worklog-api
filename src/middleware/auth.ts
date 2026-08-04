import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/httpErrors';

const BEARER_PREFIX = 'Bearer ';

/**
 * Authorization header'ındaki token'ı doğrular ve req.user'ı doldurur.
 * Bu middleware'den geçen her istekte req.user'ın dolu olduğu garanti edilir.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return next(new UnauthorizedError('Kimlik doğrulama token’ı gerekli'));
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    return next(new UnauthorizedError('Kimlik doğrulama token’ı gerekli'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * requireAuth'tan sonra çalışan kod için req.user'ı tipli biçimde okur.
 * TypeScript req.user'ı optional gördüğü için her serviste `!` yazmamak adına.
 */
export function currentUserId(req: Request): string {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user.id;
}
