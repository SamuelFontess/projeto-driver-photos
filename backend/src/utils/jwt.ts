import jwt from 'jsonwebtoken';

// lança erro no carregamento do módulo se a variável não existir — retorno é string, nunca undefined
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

// alias mantido para compatibilidade com testes existentes
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
