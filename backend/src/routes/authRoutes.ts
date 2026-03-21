import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  me,
  updateProfile,
  logout,
  refresh,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validation/authSchemas';
import { authRateLimiter, refreshRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Rotas públicas — rate limit aplicado só onde faz sentido
router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/google', authRateLimiter, validate(googleAuthSchema), googleAuth);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPassword);

// Rotas protegidas — sem rate limit (/me, /logout protegidos pelo authenticate)
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate(updateProfileSchema), updateProfile);
router.post('/logout', authenticate, logout);
router.post('/refresh', refreshRateLimiter, refresh);

export default router;
