import { Request } from 'express';
import { prisma } from './prisma';
import { logger } from './logger';
import { Prisma } from '@prisma/client';

type AuditMetadata = Prisma.InputJsonValue;

interface CreateAuditLogParams {
  req: Request;
  action: string;
  resourceType: 'user' | 'folder' | 'file' | 'auth' | 'family' | 'family_member';
  resourceId?: string | null;
  userId?: string | null;
  metadata?: AuditMetadata;
}

function extractIpAddress(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || null;
}

function extractUserAgent(req: Request): string | null {
  const userAgent = req.headers['user-agent'];
  if (!userAgent || typeof userAgent !== 'string') {
    return null;
  }
  return userAgent;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const { req, action, resourceType, resourceId, userId, metadata } = params;

  try {
    await prisma.auditLog.create({
      data: {
        action,
        resourceType,
        resourceId: resourceId ?? null,
        userId: userId ?? req.user?.userId ?? null,
        ipAddress: extractIpAddress(req),
        userAgent: extractUserAgent(req),
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    logger.warn('Failed to persist audit log', {
      action,
      resourceType,
      userId: userId ?? req.user?.userId ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
