import { Request } from 'express';

export function resolveFamilyId(req: Request): string | null {
  const raw = req.query.familyId;
  const fromQuery = Array.isArray(raw) ? raw[0] : (raw as string | null | undefined);
  if (fromQuery) return fromQuery;
  return (req.body?.familyId as string | null | undefined) ?? null;
}
