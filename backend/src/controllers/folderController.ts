import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { createAuditLog } from "../lib/auditLog";
import { requireFamilyAccess } from "../lib/familyAccess";
import { resolveFamilyId } from "../utils/requestHelpers";

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parentId = req.query.parentId as string | null | undefined;
    const familyId = resolveFamilyId(req);
    const isRoot = parentId == null;

    const limit = req.query.limit as unknown as number;
    const page = req.query.page as unknown as number;
    const skip = (page - 1) * limit;

    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    const whereClause = {
      ...(familyId ? {} : { userId }),
      familyId: familyId ?? null,
      parentId: isRoot ? null : parentId,
    };

    const [folders, total, favoriteRows] = await prisma.$transaction([
      prisma.folder.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        take: limit,
        skip,
        select: {
          id: true,
          name: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.folder.count({ where: whereClause }),
      prisma.favoriteFolder.findMany({
        where: { userId },
        select: { folderId: true },
      }),
    ]);

    const favoriteIds = new Set(favoriteRows.map((f) => f.folderId));

    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
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
          ...folder,
          childrenCount,
          filesCount,
          isFavorited: favoriteIds.has(folder.id),
        };
      }),
    );

    res.json({
      folders: foldersWithCounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error("Folder list error", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { name, parentId } = req.body;
    const familyId = resolveFamilyId(req);

    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    if (parentId != null) {
      const parent = await prisma.folder.findFirst({
        where: familyId
          ? { id: parentId, familyId }
          : { id: parentId, userId, familyId: null },
      });
      if (!parent) {
        res.status(404).json({ error: "Parent folder not found" });
        return;
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        userId,
        familyId,
        parentId: parentId ?? null,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

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

    res.status(201).json({
      folder: {
        ...folder,
        childrenCount,
        filesCount,
      },
    });

    await createAuditLog({
      req,
      action: "folder.create",
      resourceType: "folder",
      resourceId: folder.id,
      metadata: {
        name: folder.name,
        parentId: folder.parentId,
      },
    });
  } catch (error) {
    logger.error("Folder create error", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function get(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
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

    const folder = await prisma.folder.findFirst({
      where: familyId ? { id, familyId } : { id, userId, familyId: null },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        children: {
          select: {
            id: true,
            name: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        files: {
          select: {
            id: true,
            name: true,
            size: true,
            mimeType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    const isFavoritedRow = await prisma.favoriteFolder.findUnique({
      where: { userId_folderId: { userId, folderId: id } },
      select: { id: true },
    });

    res.json({ folder: { ...folder, isFavorited: isFavoritedRow !== null } });
  } catch (error) {
    logger.error("Folder get error", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// cascade do Prisma remove filhos e arquivos recursivamente
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
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

    const folder = await prisma.folder.findFirst({
      where: familyId ? { id, familyId } : { id, userId, familyId: null },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    await prisma.folder.delete({
      where: { id },
    });

    await createAuditLog({
      req,
      action: "folder.delete",
      resourceType: "folder",
      resourceId: folder.id,
      metadata: {
        name: folder.name,
        parentId: folder.parentId,
      },
    });

    res.status(204).send();
  } catch (error) {
    logger.error("Folder delete error", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// sobe a árvore de parentId até encontrar ancestorId ou chegar à raiz; visited previne loop em dados corrompidos
async function isDescendant(
  folderId: string,
  ancestorId: string,
  scope: { userId: string; familyId: string | null },
): Promise<boolean> {
  let currentId: string | null = folderId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      return false;
    }
    visited.add(currentId);

    if (currentId === ancestorId) {
      return true;
    }

    const folderResult: Prisma.FolderGetPayload<{
      select: { parentId: true; userId: true; familyId: true };
    }> | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true, userId: true, familyId: true },
    });

    if (!folderResult) {
      break;
    }

    if (scope.familyId) {
      if (folderResult.familyId !== scope.familyId) break;
    } else if (
      folderResult.userId !== scope.userId ||
      folderResult.familyId !== null
    ) {
      break;
    }

    currentId = folderResult.parentId;
  }

  return false;
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const familyId = resolveFamilyId(req);
    const { name, parentId } = req.body;

    if (familyId) {
      const familyAccess = await requireFamilyAccess(userId, familyId);
      if (!familyAccess.ok) {
        res.status(familyAccess.status).json({ error: familyAccess.error });
        return;
      }
    }

    const folder = await prisma.folder.findFirst({
      where: familyId ? { id, familyId } : { id, userId, familyId: null },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    const updateData: { name?: string; parentId?: string | null } = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (parentId !== undefined) {
      if (parentId === id) {
        res.status(400).json({ error: "Cannot move folder into itself" });
        return;
      }

      if (parentId !== null) {
        const parent = await prisma.folder.findFirst({
          where: familyId
            ? { id: parentId, familyId }
            : { id: parentId, userId, familyId: null },
        });

        if (!parent) {
          res.status(404).json({ error: "Parent folder not found" });
          return;
        }

        const wouldCreateCycle = await isDescendant(parentId, id, {
          userId,
          familyId,
        });
        if (wouldCreateCycle) {
          res.status(400).json({
            error: "Cannot move folder into its own descendant",
          });
          return;
        }
      }

      updateData.parentId = parentId;
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const [childrenCount, filesCount] = await Promise.all([
      prisma.folder.count({
        where: {
          parentId: updatedFolder.id,
          ...(familyId ? {} : { userId }),
          familyId: familyId ?? null,
        },
      }),
      prisma.file.count({
        where: {
          folderId: updatedFolder.id,
          ...(familyId ? {} : { userId }),
          familyId: familyId ?? null,
        },
      }),
    ]);

    res.json({
      folder: {
        ...updatedFolder,
        childrenCount,
        filesCount,
      },
    });

    await createAuditLog({
      req,
      action: "folder.update",
      resourceType: "folder",
      resourceId: updatedFolder.id,
      metadata: {
        updatedFields: Object.keys(updateData),
        parentId: updatedFolder.parentId,
        name: updatedFolder.name,
      },
    });
  } catch (error) {
    logger.error("Folder update error", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
