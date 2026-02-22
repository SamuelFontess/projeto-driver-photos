import multer from 'multer';
import { Request } from 'express';

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

export const files_request_limit = 20;

export const singleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: max_upload_file_size_bytes },
  fileFilter,
});
