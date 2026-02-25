import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger';

export type EmailJobType = 'family_invite' | 'forgot_password';

let emailQueue: Queue | null = null;

function getQueue(): Queue {
  if (!emailQueue) {
    const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    connection.on('error', (err) => {
      logger.warn('Email queue Redis connection error', { error: err.message });
    });

    emailQueue = new Queue('email', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return emailQueue;
}

export async function publishEmailJob<T extends Record<string, unknown>>(
  type: EmailJobType,
  payload: T,
): Promise<string> {
  try {
    const job = await getQueue().add(type, payload);
    logger.info('Email job published', { type, jobId: job.id });
    return job.id ?? '';
  } catch (error) {
    logger.warn('Email job publish failed', {
      type,
      error: error instanceof Error ? error.message : String(error),
    });
    return '';
  }
}
