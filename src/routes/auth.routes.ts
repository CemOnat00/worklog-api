import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), asyncHandler(authController.register));

authRouter.post('/login', validate(loginSchema), asyncHandler(authController.login));

authRouter.get('/me', requireAuth, asyncHandler(authController.me));
