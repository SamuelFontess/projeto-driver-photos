/** Autenticação: tipos e métodos (register, login, getMe). */

import { request } from './client';

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  token: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginData): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<{ user: User }> {
  return request<{ user: User }>('/api/auth/me', { method: 'GET' });
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<{ user: User }> {
  return request<{ user: User }>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
