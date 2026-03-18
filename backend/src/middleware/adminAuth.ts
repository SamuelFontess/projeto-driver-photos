import { Request, Response, NextFunction } from 'express';
import { isAdminEmail } from '../lib/adminEmails';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !isAdminEmail(req.user.email)) {
    res.status(403).json({ error: 'Acesso restrito' });
    return;
  }

  next();
}
