import { z } from 'zod';

export const optionalIdSchema = z.string().min(1).nullable().optional();

export const paginationSchema = {
  limit: z.preprocess(
    (v) => (v === undefined ? undefined : Number(Array.isArray(v) ? v[0] : v)),
    z.number().int().min(1).max(200).optional().default(50),
  ),
  page: z.preprocess(
    (v) => (v === undefined ? undefined : Number(Array.isArray(v) ? v[0] : v)),
    z.number().int().min(1).optional().default(1),
  ),
};
