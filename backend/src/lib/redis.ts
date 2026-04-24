import Redis from 'ioredis';
import { logger } from './logger';
import { parsePositiveInt } from '../utils/parsePositiveInt';

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

// Usa REDIS_CACHE_URL se definido, senão cai em REDIS_URL (mesma instância da fila de email).
// Para separar cache da fila, adicionar segundo container Redis e definir REDIS_CACHE_URL.
export const redisCacheUrl = process.env.REDIS_CACHE_URL || process.env.REDIS_URL || 'redis://localhost:6379';
export const redisConnectTimeoutMs = parsePositiveInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 300);

let cacheClient: Redis | null = null;
let isRedisUnavailable = false;
let hasLoggedRedisUnavailable = false;

function ensureCacheClient(): Redis {
  if (!cacheClient) {
    cacheClient = new Redis(redisCacheUrl, {
      maxRetriesPerRequest: null,
      connectTimeout: redisConnectTimeoutMs,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    cacheClient.on('ready', () => {
      isRedisUnavailable = false;
      hasLoggedRedisUnavailable = false;
      logger.info('Redis cache connected', { redisCacheUrl });
    });

    cacheClient.on('error', (error: Error) => {
      isRedisUnavailable = true;
      if (!hasLoggedRedisUnavailable) {
        hasLoggedRedisUnavailable = true;
        logger.warn('Redis cache unavailable, preview cache will be skipped', {
          error: error.message,
          redisCacheUrl,
        });
      }
    });

    cacheClient.on('close', () => {
      isRedisUnavailable = true;
      if (!hasLoggedRedisUnavailable) {
        hasLoggedRedisUnavailable = true;
        logger.warn('Redis cache connection closed, preview cache disabled');
      }
    });
  }
  return cacheClient;
}

async function getConnectedClient(): Promise<Redis | null> {
  if (isRedisUnavailable) return null;

  const client = ensureCacheClient();

  if (client.status === 'ready') {
    return client;
  }

  if (client.status === 'wait' || client.status === 'end') {
    return null;
  }

  try {
    await Promise.race([
      client.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis cache connect timeout')), redisConnectTimeoutMs)
      ),
    ]);
    isRedisUnavailable = false;
    hasLoggedRedisUnavailable = false;
    return client;
  } catch (error) {
    isRedisUnavailable = true;
    if (!hasLoggedRedisUnavailable) {
      hasLoggedRedisUnavailable = true;
      logger.warn('Failed to connect Redis cache, preview cache disabled', {
        error: error instanceof Error ? error.message : String(error),
        redisCacheUrl,
      });
    }
    return null;
  }
}

// mantido para compatibilidade com o log de startup do index.ts
export async function getRedisClient(): Promise<Redis | null> {
  return getConnectedClient();
}

export async function getPreviewFromCache(cacheKey: string): Promise<Buffer | null> {
  const client = await getConnectedClient();
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
  const client = await getConnectedClient();
  if (!client) return;

  try {
    await client.set(cacheKey, value.toString('base64'), 'EX', previewCacheTtlSeconds);
  } catch (error) {
    logger.warn('Preview cache write failed', {
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
