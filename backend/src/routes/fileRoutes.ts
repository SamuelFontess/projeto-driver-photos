import { Router } from 'express';
import { list, upload, download } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { singleFile } from '../lib/multer';

const router = Router();

// Listagem por pasta
router.get('/', authenticate, list);

router.post('/', authenticate, singleFile.single('file'), upload);

// Download pelo id do arquivo
router.get('/:id/download', authenticate, download);

export default router;
