import { z } from 'zod';

export const adminEmailSchema = z.object({
  to: z.string().trim().email('Destinatário deve ser um email válido'),
  subject: z.string().trim().min(1, 'Assunto é obrigatório'),
  body: z.string().min(1, 'Mensagem é obrigatória'),
});

export const broadcastSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  message: z.string().trim().min(1, 'Mensagem é obrigatória'),
  sendEmail: z.boolean().optional().default(false),
});
