import { randomUUID } from 'crypto';
import { getRedisClient } from './redis';
import { logger } from './logger';

export type EmailQueueEventType = 'family_invite' | 'forgot_password';

type QueueEnvelope<TPayload> = {
  id: string;
  type: EmailQueueEventType;
  occurredAt: string;
  payload: TPayload;
};

const EMAIL_QUEUE_KEY = process.env.EMAIL_QUEUE_KEY || 'driver:email:events';

export async function publishEmailQueueEvent<TPayload extends Record<string, unknown>>(
  type: EmailQueueEventType,
  payload: TPayload
): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    logger.warn('Email queue publish skipped because Redis is unavailable', {
      type,
      queueKey: EMAIL_QUEUE_KEY,
    });
    return;
  }

  const event: QueueEnvelope<TPayload> = {
    id: randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    payload,
  };

  try {
    await client.rPush(EMAIL_QUEUE_KEY, JSON.stringify(event));
  } catch (error) {
    logger.warn('Email queue publish failed', {
      type,
      queueKey: EMAIL_QUEUE_KEY,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
