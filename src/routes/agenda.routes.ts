import { Router } from 'express';
import * as agendaController from '../controllers/agenda.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { agendaQuerySchema } from '../schemas/agenda.schema';

export const agendaRouter = Router();

agendaRouter.use(requireAuth);

agendaRouter.get('/', validate(agendaQuerySchema, 'query'), asyncHandler(agendaController.get));
