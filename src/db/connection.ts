import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Singleton — veritabanı bağlantısı.
 *
 * Neden: Her istekte yeni bağlantı açmak connection pool'u tüketir ve
 * performansı düşürür. Modül seviyesinde tutulan tek bağlantı, Mongoose'un
 * kendi pool yönetiminin doğru çalışmasını sağlar.
 */
let connection: typeof mongoose | null = null;

export async function connectDatabase(uri: string = env.MONGO_URI): Promise<typeof mongoose> {
  if (connection) {
    logger.debug('Mevcut MongoDB bağlantısı yeniden kullanılıyor');
    return connection;
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB bağlantı hatası');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB bağlantısı koptu');
  });

  connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });

  logger.info({ db: mongoose.connection.name }, 'MongoDB bağlantısı kuruldu');
  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  if (!connection) return;
  await mongoose.disconnect();
  connection = null;
  logger.info('MongoDB bağlantısı kapatıldı');
}

/** Readiness kontrolü için: 1 = connected */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
