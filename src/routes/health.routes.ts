import { Router } from 'express';
import * as healthController from '../controllers/health.controller';

export const healthRouter = Router();

healthRouter.get('/', healthController.live);
healthRouter.get('/ready', healthController.ready);
