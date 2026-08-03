import type { Server } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './db/connection';
import { registerActivityListeners } from './bus/activityBus';

let server: Server | undefined;

async function start(): Promise<void> {
  await connectDatabase();

  // Observer dinleyicilerini bir kez kaydet
  registerActivityListeners();

  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `worklog-api http://localhost:${env.PORT} adresinde çalışıyor`,
    );
  });
}

/**
 * Graceful shutdown.
 *
 * Container durdurulurken (docker stop → SIGTERM) devam eden istekleri
 * yarıda kesmemek için: önce yeni bağlantı kabul etmeyi bırak, açık istekleri
 * bitir, sonra DB bağlantısını kapat. 10 saniyede bitmezse zorla çık.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Kapanma sinyali alındı, servis kapatılıyor');

  const forceExit = setTimeout(() => {
    logger.error('Zamanında kapanılamadı, süreç zorla sonlandırılıyor');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info('HTTP sunucusu kapatıldı');
    }
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Kapanma sırasında hata');
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'İşlenmemiş promise reddi');
  void shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Yakalanmamış istisna');
  process.exit(1);
});

start().catch((err) => {
  logger.fatal({ err }, 'Servis başlatılamadı');
  process.exit(1);
});
