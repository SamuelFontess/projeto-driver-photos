import { Request } from 'express';

export function resolveFamilyId(req: Request): string | null {
  const fromQuery = req.query.familyId as string | null | undefined;
  if (fromQuery) return fromQuery;
  return (req.body?.familyId as string | null | undefined) ?? null;
}
