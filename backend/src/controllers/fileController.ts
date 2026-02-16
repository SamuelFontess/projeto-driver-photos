import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { PASTA_UPLOAD } from '../lib/uploads';

const CAMPOS_ARQUIVO = {
  id: true,
  name: true,
  size: true,
  mimeType: true,
  folderId: true,
  createdAt: true,
  updatedAt: true,
} as const;


export async function list(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folderIdParam = req.query.folderId as string | undefined;
    const isRoot =
      folderIdParam === undefined || folderIdParam === '' || folderIdParam === 'null';

    const files = await prisma.file.findMany({
      where: {
        userId,
        folderId: isRoot ? null : folderIdParam,
      },
      orderBy: { name: 'asc' },
      select: CAMPOS_ARQUIVO,
    });

    res.json({ files });
  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function upload(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const folderIdParam = req.body.folderId as string | undefined;
    let folderId: string | null = null;
    if (folderIdParam != null && folderIdParam !== '') {
      const folder = await prisma.folder.findFirst({
        where: { id: folderIdParam, userId },
      });
      if (!folder) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }
      folderId = folderIdParam;
    }

    const created: Array<{
      id: string;
      name: string;
      size: number;
      mimeType: string;
      folderId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    for (const file of files) {
      const name = (file.originalname || 'file').trim();
      if (!name) continue;

      const relativePath = path.join(userId, file.filename);
      const record = await prisma.file.create({
        data: {
          name,
          path: relativePath,
          size: file.size,
          mimeType: file.mimetype || 'application/octet-stream',
          userId,
          folderId,
        },
        select: CAMPOS_ARQUIVO,
      });
      created.push(record);
    }

    res.status(201).json({ files: created });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


export async function download(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const fileRecord = await prisma.file.findFirst({
      where: { id, userId },
      select: { path: true, name: true, mimeType: true },
    });

    if (!fileRecord) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const absolutePath = path.join(PASTA_UPLOAD, fileRecord.path);
    if (!fs.existsSync(absolutePath)) {
      console.error('File on disk missing:', absolutePath);
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const safeName = fileRecord.name.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Type', fileRecord.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName.replace(/"/g, '\\"')}"`
    );

    const stream = fs.createReadStream(absolutePath);
    stream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
      else res.end();
    });
    stream.pipe(res);
  } catch (error) {
    console.error('File download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
