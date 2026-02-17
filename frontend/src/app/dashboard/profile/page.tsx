'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { api, type UpdateProfilePayload } from '@/src/lib/api';

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validação de senha se campos de senha estão visíveis
    if (showPasswordFields) {
      if (!currentPassword) {
        setError('Digite a senha atual para alterar a senha.');
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
    }

    setSaving(true);

    try {
      const payload: UpdateProfilePayload = {};
      
      if (name.trim() !== (user?.name || '')) {
        payload.name = name.trim();
      }
      
      if (email.trim().toLowerCase() !== (user?.email || '').toLowerCase()) {
        payload.email = email.trim().toLowerCase();
      }
      
      if (showPasswordFields && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setError('Nenhuma alteração foi feita.');
        setSaving(false);
        return;
      }

      const response = await api.updateProfile(payload);
      updateUser(response.user);
      
      setSuccess('Perfil atualizado com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
      
      // Limpa mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
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
          <h1>Perfil</h1>
          <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
            Voltar ao Dashboard
          </button>
        </header>

        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Editar Perfil</h2>

          {error && <p className="error-message" style={{ marginBottom: '16px' }}>{error}</p>}
          {success && (
            <p style={{ marginBottom: '16px', color: '#28a745', backgroundColor: '#d4edda', padding: '12px', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
              {success}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="profile-name" className="form-label">
                Nome
              </label>
              <input
                id="profile-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-email" className="form-label">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={saving}
              />
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#6c757d' }}>
                Ao alterar o email, você pode precisar fazer login novamente.
              </p>
            </div>

            <div style={{ marginTop: '24px', marginBottom: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowPasswordFields(!showPasswordFields);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError(null);
                }}
                disabled={saving}
              >
                {showPasswordFields ? 'Cancelar alteração de senha' : 'Alterar senha'}
              </button>
            </div>

            {showPasswordFields && (
              <>
                <div className="form-group">
                  <label htmlFor="profile-current-password" className="form-label">
                    Senha atual
                  </label>
                  <input
                    id="profile-current-password"
                    type="password"
                    className="form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-new-password" className="form-label">
                    Nova senha
                  </label>
                  <input
                    id="profile-new-password"
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-confirm-password" className="form-label">
                    Confirmar nova senha
                  </label>
                  <input
                    id="profile-confirm-password"
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a nova senha novamente"
                    disabled={saving}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push('/dashboard')}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
