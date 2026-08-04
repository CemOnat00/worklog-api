import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from './httpErrors';

export interface AccessTokenPayload {
  /** subject — kullanıcı kimliği (JWT standardında bu alanın adı `sub`) */
  sub: string;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Token'ı doğrular. Geçersiz veya süresi dolmuşsa UnauthorizedError fırlatır.
 * Süre dolması ile geçersizlik ayrı mesaj alır: ilki kullanıcının yeniden giriş
 * yapması gereken normal bir durum, ikincisi şüpheli.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded === 'string' || !decoded.sub || typeof decoded.sub !== 'string') {
      throw new UnauthorizedError('Geçersiz token');
    }

    return { sub: decoded.sub, email: String(decoded.email ?? '') };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Oturum süresi doldu, tekrar giriş yapın');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Geçersiz token');
    }
    throw err;
  }
}
