import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health.routes';
import { apiRouter } from './routes';

/**
 * Express uygulamasını kurar ama PORT DİNLEMEZ.
 *
 * Neden ayrı: testler bu fonksiyonu çağırıp app'i doğrudan Supertest'e verir;
 * gerçek bir port açılmaz, testler paralel çalışabilir. Port dinleme işi
 * server.ts'in sorumluluğunda.
 */
export function createApp(): Express {
  const app = express();

  // Sıra önemlidir: güvenlik → parse → log → route → 404 → hata
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.use('/health', healthRouter);
  app.use('/api/v1', apiRouter);

  // Bu ikisi HER ZAMAN en sonda olmalı.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
