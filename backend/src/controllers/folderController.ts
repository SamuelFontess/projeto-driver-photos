import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Lista pastas do usuário autenticado (query opcional parentId: omitido/null = raiz).
export async function list(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parentId = req.query.parentId as string | undefined;
    const isRoot = parentId === undefined || parentId === '' || parentId === 'null';

    const folders = await prisma.folder.findMany({
      where: {
        userId,
        parentId: isRoot ? null : parentId,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ folders });
  } catch (error) {
    console.error('Folder list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Cria pasta se parentId for informado, deve existir e pertencer ao mesmo usuário.
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, parentId } = req.body as { name?: string; parentId?: string | null };

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      res.status(400).json({ error: 'Name cannot be empty' });
      return;
    }

    if (parentId != null && parentId !== '') {
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, userId },
      });
      if (!parent) {
        res.status(404).json({ error: 'Parent folder not found' });
        return;
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name: trimmedName,
        userId,
        parentId: parentId && parentId !== '' ? parentId : null,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({ folder });
  } catch (error) {
    console.error('Folder create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Busca pasta por id (com filhos e arquivos); 404 se não existir ou não for do usuário.
export async function get(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const folder = await prisma.folder.findFirst({
      where: { id, userId },
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
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    res.json({ folder });
  } catch (error) {
    console.error('Folder get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Remove pasta (Cascade do Prisma remove filhos e arquivos); 404 se não existir ou não for do usuário.
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const folder = await prisma.folder.findFirst({
      where: { id, userId },
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    await prisma.folder.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Folder delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function para verificar se uma pasta é descendente de outra
async function isDescendant(folderId: string, ancestorId: string): Promise<boolean> {
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

    type FolderParent = { parentId: string | null } | null;
    const folderResult: FolderParent = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    if (!folderResult) {
      break;
    }

    currentId = folderResult.parentId;
  }

  return false;
}

// Atualiza pasta, valida ciclo e dono.
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { name, parentId } = req.body as {
      name?: string;
      parentId?: string | null;
    };

    // Verifica se a pasta existe e pertence ao usuário
    const folder = await prisma.folder.findFirst({
      where: { id, userId },
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Prepara objeto de atualização
    const updateData: { name?: string; parentId?: string | null } = {};

    // Valida e atualiza name se fornecido
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

    // Valida e atualiza parentId se fornecido
    if (parentId !== undefined) {
      // Se parentId é null ou string vazia, move para raiz
      const newParentId = parentId === '' || parentId === null ? null : parentId;

      // Não pode mover para dentro de si mesma
      if (newParentId === id) {
        res.status(400).json({ error: 'Cannot move folder into itself' });
        return;
      }

      // Se não é raiz, valida que a pasta pai existe e pertence ao usuário
      if (newParentId !== null) {
        const parent = await prisma.folder.findFirst({
          where: { id: newParentId, userId },
        });

        if (!parent) {
          res.status(404).json({ error: 'Parent folder not found' });
          return;
        }

        // Verifica se não está tentando mover para um descendente (evita ciclo)
        const wouldCreateCycle = await isDescendant(newParentId, id);
        if (wouldCreateCycle) {
          res.status(400).json({
            error: 'Cannot move folder into its own descendant',
          });
          return;
        }
      }

      updateData.parentId = newParentId;
    }

    // Se não há nada para atualizar
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    // Atualiza a pasta
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

    res.json({ folder: updatedFolder });
  } catch (error) {
    console.error('Folder update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
