import { prisma } from './prisma';

export async function getUserPrimaryEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) return null;
  return user.email.toLowerCase();
}

export async function hasFamilyAccess(userId: string, familyId: string): Promise<boolean> {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { ownerId: true },
  });

  if (!family) return false;
  if (family.ownerId === userId) return true;

  const membership = await prisma.familyMember.findFirst({
    where: {
      familyId,
      userId,
      status: 'accepted',
    },
    select: { id: true },
  });

  return Boolean(membership);
}

export async function requireFamilyAccess(
  userId: string,
  familyId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const hasAccess = await hasFamilyAccess(userId, familyId);
  if (!hasAccess) {
    return { ok: false, status: 403, error: 'Family access denied' };
  }

  return { ok: true };
}
