import { rateLimit } from 'express-rate-limit';
import { parsePositiveInt } from '../utils/parsePositiveInt';

const authWindowMs = parsePositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const authMaxRequests = parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 20);

const uploadWindowMs = parsePositiveInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS, 60 * 1000);
const uploadMaxRequests = parsePositiveInt(process.env.UPLOAD_RATE_LIMIT_MAX, 15);

export const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Rate limit dedicado para refresh de token — limita abuso de refresh token roubado
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Rate limit para operações admin — previne email spam por conta comprometida ou loop
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
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

// limita download e preview — previne enumeração e abuso de bandwidth
export const fileAccessRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// previne abuso de convites por conta comprometida
export const inviteRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many invite requests. Please try again later.' },
});

export const generalApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// rate limit dedicado para forgot-password — previne email bombing
const forgotPasswordMaxRequests = parsePositiveInt(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX, 5);

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: forgotPasswordMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
});
