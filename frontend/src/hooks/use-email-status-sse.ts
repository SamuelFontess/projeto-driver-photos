'use client';

import { useEffect, useRef } from 'react';
import { getBaseUrl } from '@/src/lib/api/client';

export type EmailStatusEvent = {
  event: 'email:status';
  jobId: string;
  type: 'family_invite' | 'family_invite_register' | 'forgot_password' | 'manual_email' | 'broadcast_email';
  status: 'sent' | 'failed';
  userId?: string;
  email?: string;
  error?: string;
};

export type SseMessageEvent = {
  event: 'message';
  id: string;
  type?: string;
  content: string;
  createdAt: string;
  target?: string;
};

export function useEmailStatusSse(
  onEvent: (event: EmailStatusEvent) => void,
  onMessage?: (event: SseMessageEvent) => void,
): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const url = `${getBaseUrl()}/api/events`;
    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as { event?: string };
        if (data.event === 'email:status') {
          onEventRef.current(data as EmailStatusEvent);
        } else if (data.event === 'message' && onMessageRef.current) {
          onMessageRef.current(data as SseMessageEvent);
        }
      } catch {
        // ignore malformed events
      }
    };

    return () => {
      es.close();
    };
  }, []);
}
