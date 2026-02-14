import { Router } from 'express';
import { register, login, me } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.post('/register', register);
router.post('/login', login);

// Rota protegida (requer autenticação)
router.get('/me', authenticate, me);

export default router;
