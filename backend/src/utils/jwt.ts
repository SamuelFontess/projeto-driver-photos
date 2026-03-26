import jwt from 'jsonwebtoken';

// requireEnv throws at module load if the variable is absent.
// The return type is string (not string | undefined), so all usages below are type-safe.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required but not set.`);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');
const REFRESH_JWT_SECRET = requireEnv('REFRESH_JWT_SECRET');

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
