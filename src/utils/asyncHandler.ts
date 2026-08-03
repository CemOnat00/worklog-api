import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4, async fonksiyonlardan fırlayan hataları kendiliğinden yakalamaz;
 * `await` içinde patlayan bir hata errorHandler'a hiç ulaşmaz ve istek asılı kalır.
 *
 * Bu sarmalayıcı, promise reddini yakalayıp next(err) ile hata zincirine aktarır.
 * Böylece her controller'da try/catch tekrarlamak gerekmez.
 *
 * Kullanım:
 *   router.get('/', asyncHandler(noteController.list));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
