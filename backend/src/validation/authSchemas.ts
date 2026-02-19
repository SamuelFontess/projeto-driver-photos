import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Email must be valid'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z
    .string()
    .trim()
    .min(1, 'Name cannot be empty')
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Email must be valid'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').optional(),
    email: z.string().trim().email('Email must be valid').optional(),
    currentPassword: z.string().min(1, 'Current password is required').optional(),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No fields to update' }
  )
  .refine(
    (data) => !data.newPassword || Boolean(data.currentPassword),
    { message: 'Current password is required to change password' }
  );
