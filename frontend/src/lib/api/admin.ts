import { request } from './client';

export interface SendAdminEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface SendBroadcastPayload {
  title: string;
  message: string;
  sendEmail: boolean;
}

export async function sendAdminEmail(payload: SendAdminEmailPayload): Promise<{ message: string }> {
  return request<{ message: string }>('/api/admin/send-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendBroadcast(payload: SendBroadcastPayload): Promise<{ message: string }> {
  return request<{ message: string }>('/api/admin/broadcast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
