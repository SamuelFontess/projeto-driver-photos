import { z } from 'zod';
import { optionalIdSchema, paginationSchema } from './sharedSchemas';

export const fileIdParamSchema = z.object({
  id: z.string().trim().min(1, 'File id is required'),
});

export const fileScopeQuerySchema = z.object({
  familyId: optionalIdSchema,
});

export const listFilesQuerySchema = z.object({
  folderId: optionalIdSchema,
  familyId: optionalIdSchema,
  search: z.string().trim().min(1).max(120).optional(),
  ...paginationSchema,
});

export const uploadFilesBodySchema = z.object({
  folderId: optionalIdSchema,
  familyId: optionalIdSchema,
});

export const updateFileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').optional(),
    folderId: optionalIdSchema,
  })
  .refine(
    (data) => data.name !== undefined || data.folderId !== undefined,
    { message: 'No fields to update' }
  );
