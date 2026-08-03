import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '../utils/httpErrors';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Bir Zod şemasını Express middleware'ine çevirir.
 *
 * Doğrulama başarılıysa isteğin ilgili bölümünü PARSE EDİLMİŞ veriyle değiştirir.
 * Bu önemli: query string'ten gelen "1" değeri number'a, tarih metni Date'e
 * dönüşmüş olur ve controller artık tipi garanti edilmiş veriyle çalışır.
 *
 * Kullanım:
 *   router.post('/', validate(createNoteSchema), asyncHandler(noteController.create));
 *   router.get('/', validate(listNotesSchema, 'query'), asyncHandler(noteController.list));
 */
export function validate(schema: ZodTypeAny, part: RequestPart = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || part,
        message: issue.message,
      }));
      return next(new ValidationError(details));
    }

    // Express 5'te req.query salt okunur olduğu için doğrudan atama yapılmaz;
    // Express 4'te sorun yok. Yine de defineProperty ile güvenli tarafta kalıyoruz.
    Object.defineProperty(req, part, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    return next();
  };
}
