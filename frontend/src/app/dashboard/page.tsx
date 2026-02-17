'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { FolderManager } from '@/src/components/FolderManager';

export default function DashboardPage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px' }}>
      <div className="container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '20px 0', flexWrap: 'wrap', gap: '12px' }}>
          <h1>Dashboard</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {user?.name && (
              <span style={{ color: '#6c757d', fontSize: '14px' }}>
                Olá, {user.name}
              </span>
            )}
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              Perfil
            </button>
            <button onClick={handleLogout} className="btn btn-danger">
              Sair
            </button>
          </div>
        </header>

        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Bem-vindo!</h2>
          <div style={{ marginBottom: '20px' }}>
            <p><strong>Email:</strong> {user?.email}</p>
            {user?.name && <p><strong>Nome:</strong> {user.name}</p>}
          </div>
        </div>

        <FolderManager />
      </div>
    </div>
  );
}
