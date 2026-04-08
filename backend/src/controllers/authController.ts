import { Request, Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { createAuditLog } from '../lib/auditLog';
import { initFirebase } from '../lib/firebase';
import { publishEmailJob } from '../lib/emailQueue';
import { isAdminEmail } from '../lib/adminEmails';
import { parsePositiveInt } from '../utils/parsePositiveInt';
import * as admin from 'firebase-admin';

const FORGOT_PASSWORD_SUCCESS_MESSAGE = 'If this email exists, password reset instructions were queued';

const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_SECURE = process.env.COOKIE_SECURE !== undefined
  ? process.env.COOKIE_SECURE === 'true'
  : IS_PROD;

function setAuthCookies(res: Response, payload: { userId: string; email: string }): void {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutos
    path: '/',
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    path: '/api/auth/refresh',
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'strict', path: '/' });
  res.clearCookie('refresh_token', { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'strict', path: '/api/auth/refresh' });
}

const PASSWORD_RESET_TOKEN_TTL_MINUTES = parsePositiveInt(
  process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
  30
);

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email: rawEmail, password, name } = req.body;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;

    // Validação básica
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    await prisma.familyMember.updateMany({
      where: { email: user.email, userId: null, status: 'pending' },
      data: { userId: user.id },
    });

    await createAuditLog({
      req,
      action: 'auth.register',
      resourceType: 'user',
      resourceId: user.id,
      userId: user.id,
      metadata: { email: user.email },
    });

    setAuthCookies(res, { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    logger.error('Register error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.password === null) {
      res.status(401).json({ error: 'Use Google to sign in with this account' });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await createAuditLog({
      req,
      action: 'auth.login',
      resourceType: 'auth',
      resourceId: user.id,
      userId: user.id,
      metadata: { email: user.email },
    });

    setAuthCookies(res, { userId: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error('Login error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({ error: 'idToken is required' });
      return;
    }

    initFirebase();
    const auth = admin.auth();
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch (error) {
      logger.warn('Google idToken verification failed', error);
      res.status(401).json({ error: 'Invalid or expired Google token' });
      return;
    }

    const { uid, email, name } = decoded;
    if (!email) {
      res.status(400).json({ error: 'Google account has no email' });
      return;
    }

    type UserShape = { id: string; email: string; name: string | null };
    let user: UserShape | null = await prisma.user.findFirst({
      where: { firebaseUid: uid },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { email },
        select: { id: true, email: true, name: true },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: uid },
        });
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          firebaseUid: uid,
          password: null,
        },
        select: { id: true, email: true, name: true },
      });
    }

    await createAuditLog({
      req,
      action: 'auth.google',
      resourceType: 'auth',
      resourceId: user.id,
      userId: user.id,
      metadata: { email: user.email },
    });

    setAuthCookies(res, { userId: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    logger.error('Google auth error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      res.status(200).json({ message: FORGOT_PASSWORD_SUCCESS_MESSAGE });
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    await publishEmailJob('forgot_password', {
      userId: user.id,
      email: user.email,
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
    });

    await createAuditLog({
      req,
      action: 'auth.forgot_password.request',
      resourceType: 'auth',
      resourceId: user.id,
      userId: user.id,
      metadata: {
        email: user.email,
      },
    });

    res.status(200).json({ message: FORGOT_PASSWORD_SUCCESS_MESSAGE });
  } catch (error) {
    logger.error('Forgot password error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body as { token: string; password: string };
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (
      !passwordResetToken ||
      passwordResetToken.usedAt !== null ||
      passwordResetToken.expiresAt <= now ||
      !passwordResetToken.user
    ) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const hashedPassword = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: passwordResetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: passwordResetToken.id },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: passwordResetToken.userId,
          usedAt: null,
          expiresAt: { gt: now },
          id: { not: passwordResetToken.id },
        },
        data: { usedAt: now },
      }),
    ]);

    await createAuditLog({
      req,
      action: 'auth.reset_password.success',
      resourceType: 'auth',
      resourceId: passwordResetToken.user.id,
      userId: passwordResetToken.user.id,
      metadata: {
        email: passwordResetToken.user.email,
      },
    });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error('Reset password error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isAdmin = isAdminEmail(user.email);

    res.json({ user: { ...user, isAdmin } });
  } catch (error) {
    logger.error('Me error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function logout(req: Request, res: Response): void {
  clearAuthCookies(res);
  res.json({ message: 'Logged out' });
}

export function refresh(req: Request, res: Response): void {
  try {
    const token = req.cookies?.refresh_token as string | undefined;

    if (!token) {
      res.status(401).json({ error: 'Refresh token missing' });
      return;
    }

    const payload = verifyRefreshToken(token);
    const newAccessToken = generateAccessToken({ userId: payload.userId, email: payload.email });

    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.json({ message: 'Token refreshed' });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = req.user.userId;
    const { name, email, currentPassword, newPassword } = req.body as {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    // Busca o usuário atual (precisa do password para validar senha atual)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData: { name?: string; email?: string; password?: string } = {};

    // Atualiza nome se fornecido
    if (name !== undefined) {
      if (typeof name !== 'string') {
        res.status(400).json({ error: 'Name must be a string' });
        return;
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        res.status(400).json({ error: 'Name cannot be empty' });
        return;
      }
      updateData.name = trimmedName;
    }

    // Atualiza email se fornecido
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        res.status(400).json({ error: 'Email must be a valid string' });
        return;
      }
      const trimmedEmail = email.trim().toLowerCase();
      
      // Verifica se o email já está em uso por outro usuário
      const existingUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });
      if (existingUser && existingUser.id !== userId) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }
      updateData.email = trimmedEmail;
    }

    // Atualiza senha se fornecida (usuários só-Google podem definir senha pela primeira vez)
    if (newPassword !== undefined) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' });
        return;
      }
      if (currentUser.password !== null) {
        if (!currentPassword) {
          res.status(400).json({ error: 'Current password is required to change password' });
          return;
        }
        const isPasswordValid = await comparePassword(currentPassword, currentUser.password);
        if (!isPasswordValid) {
          res.status(401).json({ error: 'Current password is incorrect' });
          return;
        }
      }
      updateData.password = await hashPassword(newPassword);
    }

    // Se não há nada para atualizar
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    // Atualiza o usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      req,
      action: 'user.profile.update',
      resourceType: 'user',
      resourceId: updatedUser.id,
      userId: updatedUser.id,
      metadata: {
        updatedFields: Object.keys(updateData),
      },
    });

    res.json({ user: updatedUser });
  } catch (error) {
    logger.error('Update profile error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
