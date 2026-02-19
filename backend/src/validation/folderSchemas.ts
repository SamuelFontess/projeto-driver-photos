import { z } from 'zod';

function normalizeOptionalFolderId(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return normalizeOptionalFolderId(value[0]);
  if (value === null) return null;
  if (typeof value !== 'string') return value;

  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === 'null') return null;
  return normalized;
}

const optionalFolderIdSchema = z.preprocess(
  normalizeOptionalFolderId,
  z.string().min(1).nullable().optional()
);

export const folderListQuerySchema = z.object({
  parentId: optionalFolderIdSchema,
});

export const folderIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Folder id is required'),
});

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty'),
  parentId: optionalFolderIdSchema,
});

export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').optional(),
    parentId: optionalFolderIdSchema,
  })
  .refine(
    (data) => data.name !== undefined || data.parentId !== undefined,
    { message: 'No fields to update' }
  );
