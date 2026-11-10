import { Router, json } from 'express';
import { rateLimit } from 'express-rate-limit';
import { currentAdmin, login, logout } from '../controllers/auth.controller.js';
import { requireAdmin } from '../middleware/require-admin.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many sign-in attempts. Try again later.' },
});

authRouter.post('/login', loginLimiter, json({ limit: '4kb' }), login);
authRouter.get('/me', requireAdmin, currentAdmin);
authRouter.post('/logout', requireAdmin, logout);
