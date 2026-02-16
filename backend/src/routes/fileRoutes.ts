import { Router } from 'express';
import { list, upload, download } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { singleFile, files_request_limit } from '../lib/multer';

const router = Router();

// Listagem por pasta
router.get('/', authenticate, list);

// Upload múltiplo: campo "files", body pode ter folderId
router.post('/', authenticate, singleFile.array('files', files_request_limit), upload);

// Download pelo id do arquivo
router.get('/:id/download', authenticate, download);

export default router;
