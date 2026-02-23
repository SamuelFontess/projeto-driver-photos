import { Router } from 'express';
import { list, create, get, remove, update } from '../controllers/folderController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createFolderSchema,
  folderIdParamSchema,
  folderListQuerySchema,
  folderScopeQuerySchema,
  updateFolderSchema,
} from '../validation/folderSchemas';

const router = Router();

// Todas as rotas de pastas exigem autenticação
router.get('/', authenticate, validate(folderListQuerySchema, 'query'), list);
router.post('/', authenticate, validate(createFolderSchema), create);
router.get(
  '/:id',
  authenticate,
  validate(folderIdParamSchema, 'params'),
  validate(folderScopeQuerySchema, 'query'),
  get
);
router.patch(
  '/:id',
  authenticate,
  validate(folderIdParamSchema, 'params'),
  validate(folderScopeQuerySchema, 'query'),
  validate(updateFolderSchema),
  update
);
router.delete(
  '/:id',
  authenticate,
  validate(folderIdParamSchema, 'params'),
  validate(folderScopeQuerySchema, 'query'),
  remove
);

export default router;
