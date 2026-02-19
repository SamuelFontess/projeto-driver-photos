import { Router } from 'express';
import { list, create, get, remove, update } from '../controllers/folderController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createFolderSchema,
  folderIdParamSchema,
  folderListQuerySchema,
  updateFolderSchema,
} from '../validation/folderSchemas';

const router = Router();

// Todas as rotas de pastas exigem autenticação
router.get('/', authenticate, validate(folderListQuerySchema, 'query'), list);
router.post('/', authenticate, validate(createFolderSchema), create);
router.get('/:id', authenticate, validate(folderIdParamSchema, 'params'), get);
router.patch('/:id', authenticate, validate(folderIdParamSchema, 'params'), validate(updateFolderSchema), update);
router.delete('/:id', authenticate, validate(folderIdParamSchema, 'params'), remove);

export default router;
