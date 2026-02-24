import fs from 'fs';
import { PASTA_UPLOAD } from '../lib/uploads';
import path from 'path';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { isAllowedUploadMimeType, max_upload_file_size_bytes } from '../lib/multer';
import { createAuditLog } from '../lib/auditLog';
import { getFirebaseBucket } from '../lib/firebase';
import { requireFamilyAccess } from '../lib/familyAccess';
import {
  getPreviewFromCache,
  previewCacheMaxBytes,
  previewMaxBytes,
  setPreviewInCache,
} from '../lib/redis';

function isStoragePath(filePath: string): boolean {
  return filePath.startsWith('users/');
}

function getLegacyStoragePath(diskPath: string): string | null {
  if (isStoragePath(diskPath)) return null;
  return `users/${diskPath}`;
}

function sanitizeStorageName(name: string): string {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').trim() || 'file';
}

const CAMPOS_ARQUIVO = {
  id: true,
  name: true,
  size: true,
  mimeType: true,
  familyId: true,
  folderId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function normalizeFamilyId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === 'null') return null;
  return normalized;
}

function resolveFamilyId(req: Request): string | null {
  const fromQuery = normalizeFamilyId(req.query.familyId);
  if (fromQuery) return fromQuery;
  return normalizeFamilyId(req.body?.familyId);
}

async function writeBufferToDisk(
  userId: string,
  buffer: Buffer,
  filename: string
): Promise<string> {
  const userDir = path.join(PASTA_UPLOAD, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  const relativePath = path.join(userId, filename);
  const absolutePath = path.join(PASTA_UPLOAD, relativePath);
  await fs.promises.writeFile(absolutePath, buffer);
  return relativePath;
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folderIdParam = req.query.folderId as string | undefined;
    const familyId = resolveFamilyId(req);
    const searchParam =
      typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const isRoot =
      folderIdParam === undefined || folderIdParam === '' || folderIdParam === 'null';

    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    const whereClause =
      searchParam && searchParam.length > 0
        ? {
            ...(familyId ? {} : { userId }),
            familyId: familyId ?? null,
            name: {
              contains: searchParam,
              mode: 'insensitive' as const,
            },
          }
        : {
            ...(familyId ? {} : { userId }),
            familyId: familyId ?? null,
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
      res
        .status(400)
        .json({ error: `File type not allowed: ${invalidMimeFile.mimetype || 'unknown'}` });
      return;
    }

    const oversizedFile = files.find((file) => file.size > max_upload_file_size_bytes);
    if (oversizedFile) {
      res
        .status(400)
        .json({ error: `File too large (max ${Math.floor(max_upload_file_size_bytes / (1024 * 1024))} MB)` });
      return;
    }

    const folderIdParam = req.body.folderId as string | undefined;
    const familyId = resolveFamilyId(req);
    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    let folderId: string | null = null;
    if (folderIdParam != null && folderIdParam !== '') {
      const folder = await prisma.folder.findFirst({
        where: familyId
          ? { id: folderIdParam, familyId }
          : { id: folderIdParam, userId, familyId: null },
      });
      if (!folder) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }
      folderId = folderIdParam;
    }

    const bucket = getFirebaseBucket();
    if (!bucket) {
      res.status(503).json({ error: 'Storage unavailable' });
      return;
    }
    const created: Array<{
      id: string;
      name: string;
      size: number;
      mimeType: string;
      familyId: string | null;
      folderId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    for (const file of files) {
      const name = (file.originalname || 'file').trim();
      if (!name) continue;

      const fileId = randomUUID();
      const mimeType = file.mimetype || 'application/octet-stream';
      const buffer = file.buffer;
      if (!buffer) {
        logger.warn('Upload file missing buffer', { originalname: file.originalname });
        continue;
      }

      const sanitizedName = sanitizeStorageName(name);
      const filePath = `users/${userId}/${fileId}-${sanitizedName}`;
      const storageFile = bucket.file(filePath);
      await storageFile.save(buffer, {
        metadata: { contentType: mimeType },
      });

      const record = await prisma.file.create({
        data: {
          id: fileId,
          name,
          path: filePath,
          size: file.size,
          mimeType,
          userId,
          familyId,
          folderId,
        },
        select: CAMPOS_ARQUIVO,
      });
      created.push(record);
    }

    await Promise.all(
      created.map((record) =>
        createAuditLog({
          req,
          action: 'file.upload',
          resourceType: 'file',
          resourceId: record.id,
          metadata: {
            name: record.name,
            folderId: record.folderId,
            size: record.size,
            mimeType: record.mimeType,
          },
        })
      )
    );

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
    const familyId = resolveFamilyId(req);
    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    const fileRecord = await prisma.file.findFirst({
      where: familyId ? { id, familyId } : { id, userId, familyId: null },
      select: { path: true, name: true, mimeType: true },
    });

    if (!fileRecord) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const safeName = fileRecord.name.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Type', fileRecord.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName.replace(/"/g, '\\"')}"`
    );

    await createAuditLog({
      req,
      action: 'file.download',
      resourceType: 'file',
      resourceId: id,
      metadata: {
        mimeType: fileRecord.mimeType,
        name: fileRecord.name,
      },
    });

    const bucket = getFirebaseBucket();
    if (!bucket) {
      res.status(503).json({ error: 'Storage unavailable' });
      return;
    }
    const storagePath = isStoragePath(fileRecord.path)
      ? fileRecord.path
      : getLegacyStoragePath(fileRecord.path);
    if (!storagePath) {
      res.status(404).json({
        error: 'File not found',
        code: 'LEGACY_FILE_UNAVAILABLE',
        message: 'File was stored locally and is no longer available.',
      });
      return;
    }
    try {
      const storageFile = bucket.file(storagePath);
      const [exists] = await storageFile.exists();
      if (!exists) {
        res.status(404).json({
          error: 'File not found',
          code: 'LEGACY_FILE_UNAVAILABLE',
          message: 'File was stored locally and is no longer available.',
        });
        return;
      }
      const readStream = storageFile.createReadStream();
      readStream.on('error', (err) => {
        logger.error('File stream error', err);
        if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
        else res.end();
      });
      readStream.pipe(res);
    } catch {
      res.status(404).json({
        error: 'File not found',
        code: 'LEGACY_FILE_UNAVAILABLE',
        message: 'File was stored locally and is no longer available.',
      });
    }
  } catch (error) {
    logger.error('File download error', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

function getPreviewCacheKey(fileId: string): string {
  return `preview:file:${fileId}:v1`;
}

function setPreviewHeaders(res: Response, fileName: string, mimeType: string, size: number): void {
  const safeName = fileName.replace(/[^\x20-\x7E]/g, '_');
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', String(size));
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${safeName.replace(/"/g, '\\"')}"`
  );
  res.setHeader('Cache-Control', 'private, max-age=300');
}

export async function preview(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const familyId = resolveFamilyId(req);
    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    const fileRecord = await prisma.file.findFirst({
      where: familyId ? { id, familyId } : { id, userId, familyId: null },
      select: { id: true, path: true, name: true, mimeType: true, size: true },
    });

    if (!fileRecord) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    if (fileRecord.size > previewMaxBytes) {
      res.status(413).json({ error: 'File too large for preview' });
      return;
    }

    const mimeType = fileRecord.mimeType || 'application/octet-stream';
    const cacheKey = getPreviewCacheKey(fileRecord.id);
    const cached = await getPreviewFromCache(cacheKey);

    if (cached) {
      setPreviewHeaders(res, fileRecord.name, mimeType, cached.length);
      res.end(cached);
      return;
    }

    const bucket = getFirebaseBucket();
    if (!bucket) {
      res.status(503).json({ error: 'Storage unavailable' });
      return;
    }
    const storagePath = isStoragePath(fileRecord.path)
      ? fileRecord.path
      : getLegacyStoragePath(fileRecord.path);
    if (!storagePath) {
      res.status(404).json({
        error: 'File not found',
        code: 'LEGACY_FILE_UNAVAILABLE',
        message: 'File was stored locally and is no longer available.',
      });
      return;
    }
    const storageFile = bucket.file(storagePath);
    try {
      const [exists] = await storageFile.exists();
      if (!exists) {
        res.status(404).json({
          error: 'File not found',
          code: 'LEGACY_FILE_UNAVAILABLE',
          message: 'File was stored locally and is no longer available.',
        });
        return;
      }
    } catch {
      res.status(404).json({
        error: 'File not found',
        code: 'LEGACY_FILE_UNAVAILABLE',
        message: 'File was stored locally and is no longer available.',
      });
      return;
    }
    if (fileRecord.size <= previewCacheMaxBytes) {
      try {
        const [fileBuffer] = await storageFile.download();
        await setPreviewInCache(cacheKey, fileBuffer);
        setPreviewHeaders(res, fileRecord.name, mimeType, fileBuffer.length);
        res.end(fileBuffer);
        return;
      } catch (error) {
        logger.warn('Preview Storage download failed, fallback to stream', {
          fileId: fileRecord.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    setPreviewHeaders(res, fileRecord.name, mimeType, fileRecord.size);
    const readStream = storageFile.createReadStream();
    readStream.on('error', (err) => {
      logger.error('File preview stream error', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
      else res.end();
    });
    readStream.pipe(res);
  } catch (error) {
    logger.error('File preview error', error);
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
    const familyId = resolveFamilyId(req);
    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    const file = await prisma.file.findFirst({
      where: familyId ? { id, familyId } : { id, userId, familyId: null },
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
    const familyId = resolveFamilyId(req);
    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    const { name, folderId } = req.body as {
      name?: string;
      folderId?: string | null;
    };

    const file = await prisma.file.findFirst({
      where: familyId ? { id, familyId } : { id, userId, familyId: null },
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
          where: familyId
            ? { id: nextFolderId, familyId }
            : { id: nextFolderId, userId, familyId: null },
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

    await createAuditLog({
      req,
      action: 'file.update',
      resourceType: 'file',
      resourceId: updatedFile.id,
      metadata: {
        updatedFields: Object.keys(updateData),
        name: updatedFile.name,
        folderId: updatedFile.folderId,
      },
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
    const familyId = resolveFamilyId(req);
    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    const file = await prisma.file.findFirst({
      where: familyId ? { id, familyId } : { id, userId, familyId: null },
      select: { id: true, path: true },
    });

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const bucket = getFirebaseBucket();
    const storagePath = isStoragePath(file.path) ? file.path : getLegacyStoragePath(file.path);
    if (bucket && storagePath) {
      try {
        await bucket.file(storagePath).delete();
      } catch (error) {
        const err = error as { code?: number };
        if (err.code !== 404) {
          logger.error('File delete from Storage error', error);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }
      }
    }

    await prisma.file.delete({
      where: { id: file.id },
    });

    await createAuditLog({
      req,
      action: 'file.delete',
      resourceType: 'file',
      resourceId: file.id,
      metadata: {
        path: file.path,
      },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('File remove error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
