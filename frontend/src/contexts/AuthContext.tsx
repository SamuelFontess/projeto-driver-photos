'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '@/src/lib/api';
import { logUxEvent, markUx, measureUx } from '@/src/lib/metrics/uxMetrics';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    markUx('auth-bootstrap-start');
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    } else {
      setLoading(false);
      setAuthReady(true);
      markUx('auth-bootstrap-end');
      const duration = measureUx('auth-bootstrap', 'auth-bootstrap-start', 'auth-bootstrap-end');
      logUxEvent('auth_bootstrap_finished', { durationMs: duration, authenticated: false });
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await api.getMe();
      setUser(response.user);
      setToken(authToken);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
      setAuthReady(true);
      markUx('auth-bootstrap-end');
      const duration = measureUx('auth-bootstrap', 'auth-bootstrap-start', 'auth-bootstrap-end');
      logUxEvent('auth_bootstrap_finished', { durationMs: duration, authenticated: true });
    }
  };

  const login = async (email: string, password: string) => {
    markUx('login-start');
    const response = await api.login({ email, password });
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    markUx('login-end');
    const duration = measureUx('login-flow', 'login-start', 'login-end');
    logUxEvent('login_success', { durationMs: duration });
  };

  const register = async (email: string, password: string, name?: string) => {
    markUx('register-start');
    const response = await api.register({ email, password, name });
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    markUx('register-end');
    const duration = measureUx('register-flow', 'register-start', 'register-end');
    logUxEvent('register_success', { durationMs: duration });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    logUxEvent('logout');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    authReady,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
