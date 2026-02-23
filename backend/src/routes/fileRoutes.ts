import { Router } from 'express';
import { list, upload, download, preview, get, update, remove } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { singleFile, files_request_limit } from '../lib/multer';
import { validate } from '../middleware/validate';
import {
  fileIdParamSchema,
  listFilesQuerySchema,
  fileScopeQuerySchema,
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
router.get(
  '/:id/download',
  authenticate,
  validate(fileIdParamSchema, 'params'),
  validate(fileScopeQuerySchema, 'query'),
  download
);
router.get(
  '/:id/preview',
  authenticate,
  validate(fileIdParamSchema, 'params'),
  validate(fileScopeQuerySchema, 'query'),
  preview
);

// CRUD por id (ordem após /download e /preview para evitar conflito de rota)
router.get(
  '/:id',
  authenticate,
  validate(fileIdParamSchema, 'params'),
  validate(fileScopeQuerySchema, 'query'),
  get
);
router.patch(
  '/:id',
  authenticate,
  validate(fileIdParamSchema, 'params'),
  validate(fileScopeQuerySchema, 'query'),
  validate(updateFileSchema),
  update
);
router.delete(
  '/:id',
  authenticate,
  validate(fileIdParamSchema, 'params'),
  validate(fileScopeQuerySchema, 'query'),
  remove
);

export default router;
