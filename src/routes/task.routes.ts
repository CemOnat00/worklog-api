import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../schemas/task.schema';
import { idParamSchema } from '../schemas/common.schema';

export const taskRouter = Router();

taskRouter.use(requireAuth);

taskRouter
  .route('/')
  .get(validate(listTasksQuerySchema, 'query'), asyncHandler(taskController.list))
  .post(validate(createTaskSchema), asyncHandler(taskController.create));

// Bu yol /:id'den ÖNCE tanımlanmalı değil — Express tam eşleşme yapıyor,
// /:id/status ile /:id çakışmaz. Yine de okunabilirlik için burada.
taskRouter.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateTaskStatusSchema),
  asyncHandler(taskController.updateStatus),
);

taskRouter
  .route('/:id')
  .get(validate(idParamSchema, 'params'), asyncHandler(taskController.getById))
  .patch(
    validate(idParamSchema, 'params'),
    validate(updateTaskSchema),
    asyncHandler(taskController.update),
  )
  .delete(validate(idParamSchema, 'params'), asyncHandler(taskController.remove));
