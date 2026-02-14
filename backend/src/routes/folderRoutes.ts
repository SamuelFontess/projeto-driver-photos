import { Router } from 'express';
import { list, create, get, remove } from '../controllers/folderController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas as rotas de pastas exigem autenticação
router.get('/', authenticate, list);
router.post('/', authenticate, create);
router.get('/:id', authenticate, get);
router.delete('/:id', authenticate, remove);

export default router;
