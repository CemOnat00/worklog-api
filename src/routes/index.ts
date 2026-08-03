import { Router } from 'express';

/**
 * /api/v1 altındaki tüm route'ları birleştiren ana router.
 *
 * Modüller tamamlandıkça buraya bağlanacak:
 *   authRouter   → Salı
 *   noteRouter   → Salı
 *   taskRouter   → Çarşamba
 *   eventRouter  → Çarşamba
 *   agendaRouter → Çarşamba
 */
export const apiRouter = Router();

// Geçici: API'nin ayakta ve versiyonun doğru olduğunu doğrulamak için.
// Modüller bağlandığında kaldırılacak.
apiRouter.get('/', (_req, res) => {
  res.json({
    data: {
      name: 'worklog-api',
      version: 'v1',
      endpoints: {
        auth: '/api/v1/auth        (yakında)',
        notes: '/api/v1/notes      (yakında)',
        tasks: '/api/v1/tasks      (yakında)',
        events: '/api/v1/events    (yakında)',
        agenda: '/api/v1/agenda    (yakında)',
      },
    },
  });
});

// TODO(Salı):    apiRouter.use('/auth', authRouter);
// TODO(Salı):    apiRouter.use('/notes', noteRouter);
// TODO(Çarşamba): apiRouter.use('/tasks', taskRouter);
// TODO(Çarşamba): apiRouter.use('/events', eventRouter);
// TODO(Çarşamba): apiRouter.use('/agenda', agendaRouter);
