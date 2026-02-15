import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { UPLOAD_DIR } from './uploads';

// diskStorage grava arquivos em UPLOAD_DIR/{userId}/{uuid}-{nome} para evitar conflito e manter uma pasta por usuário

const storage = multer.diskStorage({
  destination(req: Request, _file, cb) {
    const userId = req.user?.userId;
    if (!userId) {
      cb(new Error('User not authenticated'), '');
      return;
    }
    const userDir = path.join(UPLOAD_DIR, userId);
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

// Instância do Multer para upload de um único arquivo. Usar como middleware após authenticate. Limite: 10 MB por arquivo

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});
