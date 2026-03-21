import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET || 'your-refresh-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, REFRESH_JWT_SECRET, { expiresIn: '30d' });
}

// Alias mantido para compatibilidade com testes existentes
export const generateToken = generateAccessToken;

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, REFRESH_JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
}
