import { request } from './client';

export interface SendAdminEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export async function sendAdminEmail(payload: SendAdminEmailPayload): Promise<{ message: string }> {
  return request<{ message: string }>('/api/admin/send-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
