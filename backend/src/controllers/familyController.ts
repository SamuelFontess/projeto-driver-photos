import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createAuditLog } from '../lib/auditLog';
import { getUserPrimaryEmail, hasFamilyAccess } from '../lib/familyAccess';
import { publishEmailQueueEvent } from '../lib/emailQueue';

const FAMILY_SELECT = {
  id: true,
  name: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const FAMILY_MEMBER_SELECT = {
  id: true,
  familyId: true,
  userId: true,
  email: true,
  status: true,
  invitedById: true,
  invitedAt: true,
  acceptedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createFamily(req: Request, res: Response): Promise<void> {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name } = req.body as { name?: string };
    const normalizedName = typeof name === 'string' && name.trim() ? name.trim() : null;

    const existing = await prisma.family.findUnique({
      where: { ownerId },
      select: FAMILY_SELECT,
    });

    if (existing) {
      res.status(200).json({ family: existing });
      return;
    }

    const family = await prisma.family.create({
      data: {
        ownerId,
        name: normalizedName,
      },
      select: FAMILY_SELECT,
    });

    await createAuditLog({
      req,
      action: 'family.create',
      resourceType: 'family',
      resourceId: family.id,
      userId: ownerId,
      metadata: {
        name: family.name,
      },
    });

    res.status(201).json({ family });
  } catch (error) {
    logger.error('Create family error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listFamilies(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const families = await prisma.family.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                status: 'accepted',
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        ...FAMILY_SELECT,
        _count: {
          select: {
            members: {
              where: { status: 'accepted' },
            },
          },
        },
      },
    });

    res.json({ families });
  } catch (error) {
    logger.error('List families error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateFamily(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { familyId } = req.params;
    const { name } = req.body as { name?: string | null };

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: FAMILY_SELECT,
    });

    if (!family) {
      res.status(404).json({ error: 'Family not found' });
      return;
    }

    if (family.ownerId !== userId) {
      res.status(403).json({ error: 'Only owner can update family' });
      return;
    }

    const nextName =
      name === null ? null : typeof name === 'string' && name.trim() ? name.trim() : null;

    const updatedFamily = await prisma.family.update({
      where: { id: familyId },
      data: { name: nextName },
      select: FAMILY_SELECT,
    });

    await createAuditLog({
      req,
      action: 'family.update',
      resourceType: 'family',
      resourceId: updatedFamily.id,
      userId,
      metadata: {
        name: updatedFamily.name,
      },
    });

    res.json({ family: updatedFamily });
  } catch (error) {
    logger.error('Update family error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteFamily(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { familyId } = req.params;
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: FAMILY_SELECT,
    });

    if (!family) {
      res.status(404).json({ error: 'Family not found' });
      return;
    }

    if (family.ownerId !== userId) {
      res.status(403).json({ error: 'Only owner can delete family' });
      return;
    }

    await prisma.family.delete({
      where: { id: familyId },
    });

    await createAuditLog({
      req,
      action: 'family.delete',
      resourceType: 'family',
      resourceId: family.id,
      userId,
      metadata: {
        name: family.name,
      },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete family error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function inviteMember(req: Request, res: Response): Promise<void> {
  try {
    const invitedById = req.user?.userId;
    if (!invitedById) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { familyId } = req.params;
    const { email } = req.body as { email: string };
    const normalizedEmail = email.trim().toLowerCase();

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!family) {
      res.status(404).json({ error: 'Family not found' });
      return;
    }

    const canInvite =
      family.ownerId === invitedById || (await hasFamilyAccess(invitedById, familyId));
    if (!canInvite) {
      res.status(403).json({ error: 'Family access denied' });
      return;
    }

    const invitedUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (!invitedUser) {
      res.status(404).json({ error: 'User with this email was not found' });
      return;
    }

    if (invitedUser.id === family.ownerId) {
      res.status(409).json({ error: 'Owner is already in this family' });
      return;
    }

    const existing = await prisma.familyMember.findFirst({
      where: {
        familyId,
        OR: [{ userId: invitedUser.id }, { email: normalizedEmail }],
      },
      select: FAMILY_MEMBER_SELECT,
    });

    if (existing) {
      res.status(409).json({ error: 'User already invited or already a member' });
      return;
    }

    const invite = await prisma.familyMember.create({
      data: {
        familyId,
        userId: invitedUser.id,
        email: normalizedEmail,
        invitedById,
        status: 'pending',
      },
      select: FAMILY_MEMBER_SELECT,
    });

    await createAuditLog({
      req,
      action: 'family.invite',
      resourceType: 'family_member',
      resourceId: invite.id,
      userId: invitedById,
      metadata: {
        familyId,
        invitedEmail: normalizedEmail,
      },
    });

    await publishEmailQueueEvent('family_invite', {
      invitationId: invite.id,
      familyId: family.id,
      familyName: family.name,
      invitedById,
      invitedUserId: invitedUser.id,
      invitedEmail: normalizedEmail,
    });

    res.status(201).json({ invitation: invite });
  } catch (error) {
    logger.error('Invite member error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listInvitations(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const email = await getUserPrimaryEmail(userId);
    if (!email) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const invitations = await prisma.familyMember.findMany({
      where: {
        status: 'pending',
        OR: [{ userId }, { email }],
      },
      orderBy: { invitedAt: 'desc' },
      select: {
        ...FAMILY_MEMBER_SELECT,
        family: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    res.json({ invitations });
  } catch (error) {
    logger.error('List invitations error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function replyInvitation(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { action } = req.body as { action: 'accept' | 'decline' };

    const userEmail = await getUserPrimaryEmail(userId);
    if (!userEmail) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const invitation = await prisma.familyMember.findUnique({
      where: { id },
      select: FAMILY_MEMBER_SELECT,
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    const isInviteTarget = invitation.userId === userId || invitation.email === userEmail;
    if (!isInviteTarget) {
      res.status(403).json({ error: 'Invitation access denied' });
      return;
    }

    if (invitation.status !== 'pending') {
      res.status(409).json({ error: 'Invitation already handled' });
      return;
    }

    const nextStatus = action === 'accept' ? 'accepted' : 'declined';
    const updated = await prisma.familyMember.update({
      where: { id },
      data: {
        status: nextStatus,
        userId,
        acceptedAt: action === 'accept' ? new Date() : null,
      },
      select: FAMILY_MEMBER_SELECT,
    });

    await createAuditLog({
      req,
      action: action === 'accept' ? 'family.invite.accept' : 'family.invite.decline',
      resourceType: 'family_member',
      resourceId: updated.id,
      userId,
      metadata: {
        familyId: updated.familyId,
      },
    });

    res.json({ invitation: updated });
  } catch (error) {
    logger.error('Reply invitation error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listMembers(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { familyId } = req.params;
    const canAccess = await hasFamilyAccess(userId, familyId);
    if (!canAccess) {
      res.status(403).json({ error: 'Family access denied' });
      return;
    }

    const members = await prisma.familyMember.findMany({
      where: { familyId },
      orderBy: [{ status: 'asc' }, { invitedAt: 'asc' }],
      select: {
        ...FAMILY_MEMBER_SELECT,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: {
        id: true,
        name: true,
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.json({ family, members });
  } catch (error) {
    logger.error('List family members error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { familyId, userId: memberUserId } = req.params;

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: { id: true, ownerId: true },
    });

    if (!family) {
      res.status(404).json({ error: 'Family not found' });
      return;
    }

    if (family.ownerId !== userId) {
      res.status(403).json({ error: 'Only owner can remove members' });
      return;
    }

    if (memberUserId === family.ownerId) {
      res.status(400).json({ error: 'Owner cannot be removed from family' });
      return;
    }

    const member = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: memberUserId,
      },
      select: FAMILY_MEMBER_SELECT,
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    await prisma.familyMember.delete({
      where: { id: member.id },
    });

    await createAuditLog({
      req,
      action: 'family.member.remove',
      resourceType: 'family_member',
      resourceId: member.id,
      userId,
      metadata: {
        familyId,
        removedUserId: memberUserId,
      },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Remove family member error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
