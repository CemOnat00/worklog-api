import { Router } from 'express';
import { authRouter } from './auth.routes';

/**
 * /api/v1 altındaki tüm route'ları birleştiren ana router.
 */
export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  res.json({
    data: {
      name: 'worklog-api',
      version: 'v1',
      endpoints: {
        auth: '/api/v1/auth',
        notes: '/api/v1/notes      (yakında)',
        tasks: '/api/v1/tasks      (yakında)',
        events: '/api/v1/events    (yakında)',
        agenda: '/api/v1/agenda    (yakında)',
      },
    },
  });
});

apiRouter.use('/auth', authRouter);

// TODO(Salı):     apiRouter.use('/notes', noteRouter);
// TODO(Çarşamba): apiRouter.use('/tasks', taskRouter);
// TODO(Çarşamba): apiRouter.use('/events', eventRouter);
// TODO(Çarşamba): apiRouter.use('/agenda', agendaRouter);
