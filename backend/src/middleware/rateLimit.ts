import { rateLimit } from 'express-rate-limit';

function readPositiveIntFromEnv(key: string, fallback: number): number {
  const value = Number(process.env[key]);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

const authWindowMs = readPositiveIntFromEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000);
const authMaxRequests = readPositiveIntFromEnv('AUTH_RATE_LIMIT_MAX', 20);

const uploadWindowMs = readPositiveIntFromEnv('UPLOAD_RATE_LIMIT_WINDOW_MS', 60 * 1000);
const uploadMaxRequests = readPositiveIntFromEnv('UPLOAD_RATE_LIMIT_MAX', 15);

export const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

export const fileUploadRateLimiter = rateLimit({
  windowMs: uploadWindowMs,
  max: uploadMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests. Please try again later.' },
});
