import pino from 'pino';
import { env, isProduction } from './env';

/**
 * Uygulama genelinde tek logger örneği.
 *
 * - Production'da saf JSON üretir (log toplama araçları bunu bekler).
 * - Development'ta pino-pretty ile okunabilir, renkli çıktı verir.
 * - redact: hassas alanlar log'a hiç yazılmaz.
 */
export const logger = pino({
  level: env.LOG_LEVEL,

  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'body.password',
    ],
    censor: '[GİZLENDİ]',
  },

  base: { service: 'worklog-api' },

  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname,service',
          },
        },
      }),
});
