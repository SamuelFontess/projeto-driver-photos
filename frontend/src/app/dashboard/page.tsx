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
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '20px 0' }}>
          <h1>Dashboard</h1>
          <button onClick={handleLogout} className="btn btn-danger">
            Sair
          </button>
        </header>

        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Bem-vindo!</h2>

          <div style={{ marginBottom: '20px' }}>
            <p><strong>ID:</strong> {user?.id}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            {user?.name && <p><strong>Nome:</strong> {user.name}</p>}
          </div>

          <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <h3 style={{ marginBottom: '10px' }}>Próximos Passos</h3>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Upload de arquivos</li>
              <li>Listagem de arquivos</li>
              <li>Download de arquivos</li>
            </ul>
          </div>
        </div>

        <FolderManager />
      </div>
    </div>
  );
}
