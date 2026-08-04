import { Router } from 'express';
import * as noteController from '../controllers/note.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createNoteSchema, listNotesQuerySchema, updateNoteSchema } from '../schemas/note.schema';
import { idParamSchema } from '../schemas/common.schema';

export const noteRouter = Router();

// Bu router'daki tüm yollar kimlik doğrulaması ister.
// Tek satırda uygulanıyor; her route'ta tekrarlanmıyor.
noteRouter.use(requireAuth);

noteRouter
  .route('/')
  .get(validate(listNotesQuerySchema, 'query'), asyncHandler(noteController.list))
  .post(validate(createNoteSchema), asyncHandler(noteController.create));

noteRouter
  .route('/:id')
  .get(validate(idParamSchema, 'params'), asyncHandler(noteController.getById))
  .patch(
    validate(idParamSchema, 'params'),
    validate(updateNoteSchema),
    asyncHandler(noteController.update),
  )
  .delete(validate(idParamSchema, 'params'), asyncHandler(noteController.remove));
