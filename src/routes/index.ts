import { Router } from 'express';
import { authRouter } from './auth.routes';
import { noteRouter } from './note.routes';
import { taskRouter } from './task.routes';
import { eventRouter } from './event.routes';
import { agendaRouter } from './agenda.routes';

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
        notes: '/api/v1/notes',
        tasks: '/api/v1/tasks',
        events: '/api/v1/events',
        agenda: '/api/v1/agenda',
      },
    },
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/notes', noteRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/events', eventRouter);
apiRouter.use('/agenda', agendaRouter);
