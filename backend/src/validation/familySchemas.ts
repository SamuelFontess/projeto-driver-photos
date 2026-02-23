import { z } from 'zod';

function normalizeOptionalFamilyName(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return normalizeOptionalFamilyName(value[0]);
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

export const familyIdParamSchema = z.object({
  familyId: z.string().trim().min(1, 'Family id is required'),
});

export const invitationIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Invitation id is required'),
});

export const memberUserIdParamSchema = z.object({
  familyId: z.string().trim().min(1, 'Family id is required'),
  userId: z.string().trim().min(1, 'User id is required'),
});

export const createFamilySchema = z.object({
  name: z.preprocess(normalizeOptionalFamilyName, z.string().min(1).max(120).nullable().optional()),
});

export const updateFamilySchema = z.object({
  name: z.preprocess(normalizeOptionalFamilyName, z.string().min(1).max(120).nullable()),
});

export const createFamilyInviteSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
});

export const updateInvitationSchema = z.object({
  action: z.enum(['accept', 'decline']),
});
