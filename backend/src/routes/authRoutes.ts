import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.post('/register', register);
router.post('/login', login);

// Rotas protegidas (requerem autenticação)
router.get('/me', authenticate, me);
router.patch('/me', authenticate, updateProfile);

export default router;
