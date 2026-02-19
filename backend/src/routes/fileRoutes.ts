import { Router } from 'express';
import { list, upload, download, get, update, remove } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { singleFile, files_request_limit } from '../lib/multer';
import { validate } from '../middleware/validate';
import {
  fileIdParamSchema,
  listFilesQuerySchema,
  updateFileSchema,
  uploadFilesBodySchema,
} from '../validation/fileSchemas';
import { fileUploadRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Listagem por pasta
router.get('/', authenticate, validate(listFilesQuerySchema, 'query'), list);

// Upload múltiplo: campo "files", body pode ter folderId
router.post(
  '/',
  authenticate,
  fileUploadRateLimiter,
  singleFile.array('files', files_request_limit),
  validate(uploadFilesBodySchema),
  upload
);

// Download pelo id do arquivo
router.get('/:id/download', authenticate, validate(fileIdParamSchema, 'params'), download);

// CRUD por id (ordem após /:id/download para evitar conflito de rota)
router.get('/:id', authenticate, validate(fileIdParamSchema, 'params'), get);
router.patch('/:id', authenticate, validate(fileIdParamSchema, 'params'), validate(updateFileSchema), update);
router.delete('/:id', authenticate, validate(fileIdParamSchema, 'params'), remove);

export default router;
