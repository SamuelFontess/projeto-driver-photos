import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger';

export type BroadcastMessagePayload = {
  type?: string;
  content: string;
  target?: string;
};

let broadcastQueue: Queue | null = null;

function getQueue(): Queue {
  if (!broadcastQueue) {
    const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    connection.on('error', (err) => {
      logger.warn('Broadcast queue Redis connection error', { error: err.message });
    });

    broadcastQueue = new Queue('broadcast', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return broadcastQueue;
}

export async function publishBroadcastJob(payload: BroadcastMessagePayload): Promise<string> {
  try {
    const job = await getQueue().add('broadcast_message', payload);
    logger.info('Broadcast job published', { jobId: job.id });
    return job.id ?? '';
  } catch (error) {
    logger.warn('Broadcast job publish failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return '';
  }
}
