import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { PASTA_UPLOAD } from './uploads';

const DEFAULT_MAX_UPLOAD_FILE_SIZE_MB = 10;
const parsedMaxUploadFileSizeMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB);
const maxUploadFileSizeMb =
  Number.isFinite(parsedMaxUploadFileSizeMb) && parsedMaxUploadFileSizeMb > 0
    ? parsedMaxUploadFileSizeMb
    : DEFAULT_MAX_UPLOAD_FILE_SIZE_MB;

export const max_upload_file_size_bytes = Math.floor(maxUploadFileSizeMb * 1024 * 1024);

export const allowed_upload_mime_types = new Set([
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

export function isAllowedUploadMimeType(mimeType: string): boolean {
  const mime = (mimeType || 'application/octet-stream').toLowerCase();
  return allowed_upload_mime_types.has(mime);
}

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (isAllowedUploadMimeType(file.mimetype)) {
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

// Middleware de upload; usar após authenticate, limite por arquivo configurável
export const files_request_limit = 20;

export const singleFile = multer({
  storage: armazenamento_disco,
  limits: { fileSize: max_upload_file_size_bytes },
  fileFilter,
});
