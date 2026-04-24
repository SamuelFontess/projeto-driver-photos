import { z } from "zod";
import { optionalIdSchema, paginationSchema } from "./sharedSchemas";

export const folderListQuerySchema = z.object({
  parentId: optionalIdSchema,
  familyId: optionalIdSchema,
  ...paginationSchema,
});

export const folderScopeQuerySchema = z.object({
  familyId: optionalIdSchema,
});

export const folderIdParamSchema = z.object({
  id: z.string().trim().min(1, "Folder id is required"),
});

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(255, "Name is too long"),
  parentId: optionalIdSchema,
  familyId: optionalIdSchema,
});

export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").max(255, "Name is too long").optional(),
    parentId: optionalIdSchema,
  })
  .refine((data) => data.name !== undefined || data.parentId !== undefined, {
    message: "No fields to update",
  });
