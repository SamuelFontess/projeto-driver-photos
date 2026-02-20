import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { createAuditLog } from '../lib/auditLog';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

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

    // Gerar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    await createAuditLog({
      req,
      action: 'auth.register',
      resourceType: 'user',
      resourceId: user.id,
      userId: user.id,
      metadata: { email: user.email },
    });

    res.status(201).json({
      message: 'User created successfully',
      user,
      token,
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

    // Verificar senha
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Gerar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    await createAuditLog({
      req,
      action: 'auth.login',
      resourceType: 'auth',
      resourceId: user.id,
      userId: user.id,
      metadata: { email: user.email },
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    logger.error('Login error', error);
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

    res.json({ user });
  } catch (error) {
    logger.error('Me error', error);
    res.status(500).json({ error: 'Internal server error' });
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

    // Atualiza senha se fornecida
    if (newPassword !== undefined) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to change password' });
        return;
      }
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' });
        return;
      }
      
      // Valida senha atual
      const isPasswordValid = await comparePassword(currentPassword, currentUser.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }
      
      // Hash da nova senha
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
