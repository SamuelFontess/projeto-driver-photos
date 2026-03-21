'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '@/src/lib/api';
import { logUxEvent, markUx, measureUx } from '@/src/lib/metrics/uxMetrics';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    markUx('auth-bootstrap-start');
    fetchUser();

    const handleSessionExpired = () => setUser(null);
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.getMe();
      setUser(response.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
      setAuthReady(true);
      markUx('auth-bootstrap-end');
      const duration = measureUx('auth-bootstrap', 'auth-bootstrap-start', 'auth-bootstrap-end');
      logUxEvent('auth_bootstrap_finished', { durationMs: duration, authenticated: !!user });
    }
  };

  const login = async (email: string, password: string) => {
    markUx('login-start');
    const response = await api.login({ email, password });
    setUser(response.user);
    markUx('login-end');
    const duration = measureUx('login-flow', 'login-start', 'login-end');
    logUxEvent('login_success', { durationMs: duration });
  };

  const loginWithGoogle = async () => {
    markUx('login-google-start');
    const { signInWithGoogle } = await import('@/src/lib/firebase');
    const idToken = await signInWithGoogle();
    const response = await api.loginWithGoogle(idToken);
    setUser(response.user);
    markUx('login-google-end');
    const duration = measureUx('login-google-flow', 'login-google-start', 'login-google-end');
    logUxEvent('login_google_success', { durationMs: duration });
  };

  const register = async (email: string, password: string, name?: string) => {
    markUx('register-start');
    const response = await api.register({ email, password, name });
    setUser(response.user);
    markUx('register-end');
    const duration = measureUx('register-flow', 'register-start', 'register-end');
    logUxEvent('register_success', { durationMs: duration });
  };

  const logout = async () => {
    try {
      await api.logoutRequest();
    } finally {
      setUser(null);
      logUxEvent('logout');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    loading,
    authReady,
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
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
