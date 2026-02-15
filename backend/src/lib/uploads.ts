import path from 'path';
import fs from 'fs';


export const PASTA_UPLOAD = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

// Garante que o diretório de upload existe no disco

export function ensureUploadDir(): void {
  if (!fs.existsSync(PASTA_UPLOAD)) {
    fs.mkdirSync(PASTA_UPLOAD, { recursive: true });
  }
}
