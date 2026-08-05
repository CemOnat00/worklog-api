import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createEventSchema,
  listEventsQuerySchema,
  updateEventSchema,
} from '../schemas/event.schema';
import { idParamSchema } from '../schemas/common.schema';

export const eventRouter = Router();

eventRouter.use(requireAuth);

eventRouter
  .route('/')
  .get(validate(listEventsQuerySchema, 'query'), asyncHandler(eventController.list))
  .post(validate(createEventSchema), asyncHandler(eventController.create));

eventRouter
  .route('/:id')
  .get(validate(idParamSchema, 'params'), asyncHandler(eventController.getById))
  .patch(
    validate(idParamSchema, 'params'),
    validate(updateEventSchema),
    asyncHandler(eventController.update),
  )
  .delete(validate(idParamSchema, 'params'), asyncHandler(eventController.remove));
