import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { PASTA_UPLOAD } from '../lib/uploads';
import { isAllowedUploadMimeType, max_upload_file_size_bytes } from '../lib/multer';

const CAMPOS_ARQUIVO = {
  id: true,
  name: true,
  size: true,
  mimeType: true,
  folderId: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function cleanupUploadedFiles(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      if (!file.path) return;
      try {
        await fs.promises.unlink(file.path);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== 'ENOENT') {
          logger.warn('Failed to cleanup uploaded file', { path: file.path, error: err.message });
        }
      }
    })
  );
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folderIdParam = req.query.folderId as string | undefined;
    const searchParam =
      typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const isRoot =
      folderIdParam === undefined || folderIdParam === '' || folderIdParam === 'null';

    const whereClause =
      searchParam && searchParam.length > 0
        ? {
            userId,
            name: {
              contains: searchParam,
              mode: 'insensitive' as const,
            },
          }
        : {
            userId,
            folderId: isRoot ? null : folderIdParam,
          };

    const files = await prisma.file.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: CAMPOS_ARQUIVO,
    });

    res.json({ files });
  } catch (error) {
    logger.error('File list error', error);
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

    const invalidMimeFile = files.find((file) => !isAllowedUploadMimeType(file.mimetype));
    if (invalidMimeFile) {
      await cleanupUploadedFiles(files);
      res
        .status(400)
        .json({ error: `File type not allowed: ${invalidMimeFile.mimetype || 'unknown'}` });
      return;
    }

    const oversizedFile = files.find((file) => file.size > max_upload_file_size_bytes);
    if (oversizedFile) {
      await cleanupUploadedFiles(files);
      res
        .status(400)
        .json({ error: `File too large (max ${Math.floor(max_upload_file_size_bytes / (1024 * 1024))} MB)` });
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
    logger.error('File upload error', error);
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
      logger.warn('File on disk missing', { path: absolutePath });
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
      logger.error('File stream error', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
      else res.end();
    });
    stream.pipe(res);
  } catch (error) {
    logger.error('File download error', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function get(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const file = await prisma.file.findFirst({
      where: { id, userId },
      select: CAMPOS_ARQUIVO,
    });

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.json({ file });
  } catch (error) {
    logger.error('File get error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { name, folderId } = req.body as {
      name?: string;
      folderId?: string | null;
    };

    const file = await prisma.file.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const updateData: { name?: string; folderId?: string | null } = {};

    if (name !== undefined) {
      if (typeof name !== 'string') {
        res.status(400).json({ error: 'Name must be a string' });
        return;
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        res.status(400).json({ error: 'Name cannot be empty' });
        return;
      }

      updateData.name = trimmedName;
    }

    if (folderId !== undefined) {
      const nextFolderId = folderId === '' || folderId === null ? null : folderId;

      if (nextFolderId !== null) {
        const folder = await prisma.folder.findFirst({
          where: { id: nextFolderId, userId },
          select: { id: true },
        });

        if (!folder) {
          res.status(404).json({ error: 'Folder not found' });
          return;
        }
      }

      updateData.folderId = nextFolderId;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const updatedFile = await prisma.file.update({
      where: { id },
      data: updateData,
      select: CAMPOS_ARQUIVO,
    });

    res.json({ file: updatedFile });
  } catch (error) {
    logger.error('File update error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const file = await prisma.file.findFirst({
      where: { id, userId },
      select: { id: true, path: true },
    });

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const absolutePath = path.join(PASTA_UPLOAD, file.path);
    try {
      await fs.promises.unlink(absolutePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        logger.error('File delete from disk error', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
    }

    await prisma.file.delete({
      where: { id: file.id },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('File remove error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
