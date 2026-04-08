'use client';

import { useEffect, useRef } from 'react';
import { getBaseUrl } from '@/src/lib/api/client';

export type EmailStatusEvent = {
  event: 'email:status';
  jobId: string;
  type: 'family_invite' | 'family_invite_register' | 'forgot_password' | 'manual_email';
  status: 'sent' | 'failed';
  userId?: string;
  email?: string;
  error?: string;
};

export function useEmailStatusSse(onEvent: (event: EmailStatusEvent) => void): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const url = `${getBaseUrl()}/api/events`;
    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as EmailStatusEvent;
        if (data.event === 'email:status') {
          onEventRef.current(data);
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
