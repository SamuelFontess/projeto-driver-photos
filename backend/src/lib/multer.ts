import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { PASTA_UPLOAD } from './uploads';

const TIPOS_PERMITIDOS = new Set([
  'application/pdf',
  'application/json',
  'application/zip',
  'application/x-rar-compressed',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'text/csv',
  'text/html',
]);

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const mime = (file.mimetype || 'application/octet-stream').toLowerCase();
  if (TIPOS_PERMITIDOS.has(mime)) {
    cb(null, true);
    return;
  }
  cb(new Error(`File type not allowed: ${file.mimetype}`));
}

// diskStorage grava em PASTA_UPLOAD/{userId}/{uuid}-{nome}

const armazenamento_disco = multer.diskStorage({
  destination(req: Request, _file, cb) {
    const userId = req.user?.userId;
    if (!userId) {
      cb(new Error('User not authenticated'), '');
      return;
    }
    const userDir = path.join(PASTA_UPLOAD, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename(_req, file, cb) {
    const uuid = randomUUID();
    const sanitized = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uuid}-${sanitized}`);
  },
});

// Middleware de upload; usar após authenticate, Limite 10 MB por arquivo
export const files_request_limit = 20;

export const singleFile = multer({
  storage: armazenamento_disco,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});
