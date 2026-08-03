/**
 * Uygulamanın bilinçli olarak fırlattığı hataların taban sınıfı.
 *
 * Bu sınıftan türeyen hatalar "beklenen" hatalardır (kayıt yok, yetki yok,
 * çakışma var...). errorHandler bunları olduğu gibi istemciye çevirir.
 * Bu sınıftan türemeyen hatalar "beklenmeyen"dir; istemciye 500 döner ve
 * detay sızdırılmaz.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}
