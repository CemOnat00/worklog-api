import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

/**
 * Her isteğe benzersiz bir requestId atar ve istek/yanıt satırını log'lar.
 *
 * Neden requestId: Bir isteğin ürettiği tüm log satırları aynı id ile
 * işaretlenir. Hata ayıklarken "şu isteğe ne oldu" sorusunu tek bir filtreyle
 * cevaplayabilirsin.
 */
export const requestLogger = pinoHttp({
  logger,

  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },

  customLogLevel: (_req, res, err) => {
    if (err) return 'error';
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode} (hata)`,

  // /health her saniye çağrılır; log'u kirletmesin
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});
