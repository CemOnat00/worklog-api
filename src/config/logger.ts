import pino from 'pino';
import { env, isProduction } from './env';

/**
 * Uygulama genelinde tek logger örneği.
 *
 * - Production'da saf JSON üretir (log toplama araçları bunu bekler).
 * - Development'ta pino-pretty ile okunabilir, renkli çıktı verir.
 * - redact: hassas alanlar log'a hiç yazılmaz.
 */

/**
 * pino-pretty bir devDependency; production imajında `npm ci --omit=dev` ile
 * kurulmuyor. NODE_ENV yanlışlıkla 'production' dışında bir değer alırsa
 * pino açılışta "unable to determine transport target" hatasıyla süreci
 * öldürüyordu. Paketin gerçekten çözümlenebildiğini kontrol ediyoruz:
 * log biçimi bir yapılandırma tercihi, uygulamayı düşürecek bir sebep değil.
 */
function prettyTransport(): Parameters<typeof pino>[0] {
  if (isProduction) return {};

  try {
    require.resolve('pino-pretty');
  } catch {
    return {};
  }

  return {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname,service',
      },
    },
  };
}
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

  ...prettyTransport(),
});
