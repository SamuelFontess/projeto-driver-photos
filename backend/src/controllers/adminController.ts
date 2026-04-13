import { Request, Response } from 'express';
import { publishEmailJob, publishEmailJobsBulk } from '../lib/emailQueue';
import { publishBroadcastJob } from '../lib/broadcastQueue';
import { createAuditLog } from '../lib/auditLog';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

export async function sendManualEmail(req: Request, res: Response): Promise<void> {
  try {
    const { to, subject, body } = req.body;

    await publishEmailJob('manual_email', { to, subject, html: body });

    await createAuditLog({
      req,
      action: 'admin.send_email',
      resourceType: 'user',
      resourceId: null,
      metadata: { to, subject },
    });

    res.json({ message: 'Email enviado com sucesso' });
  } catch (error) {
    logger.error('Admin send email error', error);
    res.status(500).json({ error: 'Falha ao enviar email' });
  }
}

export async function sendBroadcast(req: Request, res: Response): Promise<void> {
  try {
    const { title, message, sendEmail } = req.body;

    await publishBroadcastJob({ type: title, content: message });

    if (sendEmail) {
      const users = await prisma.user.findMany({ select: { email: true } });
      await publishEmailJobsBulk(
        users.map((user) => ({
          type: 'broadcast_email' as const,
          payload: { to: user.email, subject: title, title, message },
        })),
      );
    }

    await createAuditLog({
      req,
      action: 'admin.broadcast',
      resourceType: 'user',
      resourceId: null,
      metadata: { title, sendEmail },
    });

    res.json({ message: 'Broadcast enviado com sucesso' });
  } catch (error) {
    logger.error('Admin broadcast error', error);
    res.status(500).json({ error: 'Falha ao enviar broadcast' });
  }
}
