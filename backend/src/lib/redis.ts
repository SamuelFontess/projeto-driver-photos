import { logger } from './logger';

type RedisClient = {
  isOpen: boolean;
  isReady: boolean;
  on(event: string, listener: (...args: unknown[]) => void): void;
  connect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<void>;
  rPush(key: string, value: string): Promise<number>;
};

type RedisModule = {
  createClient(options: { url: string }): RedisClient;
};

function loadRedisModule(): RedisModule | null {
  try {
    return require('redis') as RedisModule;
  } catch {
    logger.warn('Redis package not found. Preview cache will use disk fallback only.');
    return null;
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export const previewCacheTtlSeconds = parsePositiveInt(
  process.env.FILE_PREVIEW_CACHE_TTL_SECONDS,
  60 * 60
);
export const previewCacheMaxBytes = parsePositiveInt(
  process.env.FILE_PREVIEW_CACHE_MAX_BYTES,
  20 * 1024 * 1024
);
export const previewMaxBytes = parsePositiveInt(
  process.env.FILE_PREVIEW_MAX_BYTES,
  50 * 1024 * 1024
);
export const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisConnectTimeoutMs = parsePositiveInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 300);

let redisClient: RedisClient | null = null;
let connectPromise: Promise<void> | null = null;
let isRedisUnavailable = false;
let hasLoggedRedisUnavailable = false;

function stringifyUnknownError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === 'object') {
    const code =
      'code' in error && typeof error.code === 'string' && error.code.trim().length > 0
        ? error.code
        : undefined;
    const message =
      'message' in error && typeof error.message === 'string' && error.message.trim().length > 0
        ? error.message
        : undefined;

    if (code || message) {
      return [code, message].filter(Boolean).join(': ');
    }
  }

  return 'Unknown Redis error';
}

function ensureRedisClient(): RedisClient | null {
  if (!redisClient) {
    const redis = loadRedisModule();
    if (!redis) {
      return null;
    }

    redisClient = redis.createClient({ url: redisUrl });
    redisClient.on('ready', () => {
      isRedisUnavailable = false;
      hasLoggedRedisUnavailable = false;
      logger.info('Redis connected for preview cache');
    });
    redisClient.on('error', (error: unknown) => {
      isRedisUnavailable = true;
      if (!hasLoggedRedisUnavailable) {
        hasLoggedRedisUnavailable = true;
        logger.warn('Redis unavailable, preview cache will fallback to disk', {
          error: stringifyUnknownError(error),
          redisUrl,
        });
      }
    });
    redisClient.on('end', () => {
      isRedisUnavailable = true;
      if (!hasLoggedRedisUnavailable) {
        hasLoggedRedisUnavailable = true;
        logger.warn('Redis connection closed, using disk preview fallback');
      }
    });
  }

  return redisClient;
}

async function connectIfNeeded(client: RedisClient): Promise<void> {
  if (client.isOpen) return;
  if (!connectPromise) {
    connectPromise = client.connect().finally(() => {
      connectPromise = null;
    });
  }

  await Promise.race([
    connectPromise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis connect timeout')), redisConnectTimeoutMs);
    }),
  ]);
}

export async function getRedisClient(): Promise<RedisClient | null> {
  const client = ensureRedisClient();
  if (!client || isRedisUnavailable) {
    return null;
  }

  try {
    await connectIfNeeded(client);
    if (client.isReady) {
      isRedisUnavailable = false;
      hasLoggedRedisUnavailable = false;
      return client;
    }
    return null;
  } catch (error) {
    isRedisUnavailable = true;
    if (!hasLoggedRedisUnavailable) {
      hasLoggedRedisUnavailable = true;
      logger.warn('Failed to connect Redis, using disk preview fallback', {
        error: stringifyUnknownError(error),
        redisUrl,
      });
    }
    return null;
  }
}

export async function getPreviewFromCache(cacheKey: string): Promise<Buffer | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(cacheKey);
    if (value == null) return null;
    return Buffer.from(value, 'base64');
  } catch (error) {
    logger.warn('Preview cache read failed', {
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setPreviewInCache(cacheKey: string, value: Buffer): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    await client.set(cacheKey, value.toString('base64'), {
      EX: previewCacheTtlSeconds,
    });
  } catch (error) {
    logger.warn('Preview cache write failed', {
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
