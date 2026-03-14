import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { requireFamilyAccess } from '../lib/familyAccess';

export async function toggleFavorite(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id: folderId } = req.params;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, userId: true, familyId: true },
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    if (folder.familyId) {
      const familyAccess = await requireFamilyAccess(userId, folder.familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    } else if (folder.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const existing = await prisma.favoriteFolder.findUnique({
      where: { userId_folderId: { userId, folderId } },
    });

    if (existing) {
      await prisma.favoriteFolder.delete({
        where: { userId_folderId: { userId, folderId } },
      });
      res.json({ isFavorited: false });
    } else {
      await prisma.favoriteFolder.create({
        data: { userId, folderId },
      });
      res.json({ isFavorited: true });
    }
  } catch (error) {
    logger.error('Toggle favorite error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getFavorites(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const favorites = await prisma.favoriteFolder.findMany({
      where: { userId },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            parentId: true,
            userId: true,
            familyId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const foldersWithCounts = await Promise.all(
      favorites.map(async (fav) => {
        const folder = fav.folder;
        const familyId = folder.familyId;
        const [childrenCount, filesCount] = await Promise.all([
          prisma.folder.count({
            where: {
              parentId: folder.id,
              ...(familyId ? {} : { userId }),
              familyId: familyId ?? null,
            },
          }),
          prisma.file.count({
            where: {
              folderId: folder.id,
              ...(familyId ? {} : { userId }),
              familyId: familyId ?? null,
            },
          }),
        ]);

        return {
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
          childrenCount,
          filesCount,
          isFavorited: true,
        };
      })
    );

    res.json({ folders: foldersWithCounts });
  } catch (error) {
    logger.error('Get favorites error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
