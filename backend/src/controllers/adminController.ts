import { Request, Response } from 'express';
import { sendEmail } from '../lib/emailSender';
import { createAuditLog } from '../lib/auditLog';
import { logger } from '../lib/logger';

export async function sendManualEmail(req: Request, res: Response): Promise<void> {
  try {
    const { to, subject, body } = req.body as { to: string; subject: string; body: string };

    await sendEmail({ to, subject, html: body });

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
