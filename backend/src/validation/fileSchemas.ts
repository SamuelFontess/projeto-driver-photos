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

function normalizeOptionalFamilyId(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return normalizeOptionalFamilyId(value[0]);
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

const optionalFamilyIdSchema = z.preprocess(
  normalizeOptionalFamilyId,
  z.string().min(1).nullable().optional()
);

export const fileIdParamSchema = z.object({
  id: z.string().trim().min(1, 'File id is required'),
});

export const fileScopeQuerySchema = z.object({
  familyId: optionalFamilyIdSchema,
});

export const listFilesQuerySchema = z.object({
  folderId: optionalFolderIdSchema,
  familyId: optionalFamilyIdSchema,
  search: z
    .preprocess((value) => {
      if (value === undefined) return undefined;
      if (Array.isArray(value)) return value[0];
      if (typeof value !== 'string') return value;
      const normalized = value.trim();
      return normalized.length ? normalized : undefined;
    }, z.string().min(1).max(120).optional()),
});

export const uploadFilesBodySchema = z.object({
  folderId: optionalFolderIdSchema,
  familyId: optionalFamilyIdSchema,
});

export const updateFileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').optional(),
    folderId: optionalFolderIdSchema,
  })
  .refine(
    (data) => data.name !== undefined || data.folderId !== undefined,
    { message: 'No fields to update' }
  );
