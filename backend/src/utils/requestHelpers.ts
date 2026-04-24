import { Request } from 'express';

export function resolveFamilyId(req: Request): string | null {
  const raw = Array.isArray(req.query.familyId) ? req.query.familyId[0] : req.query.familyId;
  const fromQuery = typeof raw === 'string' ? raw : undefined;
  if (fromQuery) return fromQuery;
  return (req.body?.familyId as string | null | undefined) ?? null;
}
