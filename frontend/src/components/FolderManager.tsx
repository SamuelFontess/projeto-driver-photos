'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type Folder } from '@/src/lib/api';

type BreadcrumbItem = { id: string | null; name: string };

export function FolderManager() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: null, name: 'Raiz' }]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadFolders = useCallback(async (parentId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const parent = parentId === undefined ? undefined : parentId;
      const { folders: list } = await api.getFolders(parent);
      setFolders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pastas');
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders(currentFolderId);
  }, [currentFolderId, loadFolders]);

  const handleEnterFolder = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBack = () => {
    if (breadcrumb.length <= 1) return;
    const next = breadcrumb.slice(0, -1);
    setBreadcrumb(next);
    setCurrentFolderId(next[next.length - 1].id);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) {
      setCreateError('Digite um nome para a pasta.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await api.createFolder(name, currentFolderId);
      setNewFolderName('');
      setShowNewFolder(false);
      await loadFolders(currentFolderId);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar pasta');
    } finally {
      setCreating(false);
    }
  };

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    const index = breadcrumb.findIndex((b) => b.id === item.id);
    if (index < 0) return;
    setBreadcrumb(breadcrumb.slice(0, index + 1));
    setCurrentFolderId(item.id);
  };

  const isRoot = breadcrumb.length <= 1;

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Minhas pastas</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => { setShowNewFolder(true); setCreateError(null); setNewFolderName(''); }}
        >
          Nova pasta
        </button>
      </div>

      {/* Breadcrumb: permite navegar clicando em qualquer nível */}
      <nav style={{ marginBottom: '16px', fontSize: '14px' }} aria-label="Navegação por pastas">
        {breadcrumb.map((item, i) => (
          <span key={item.id ?? 'root'}>
            {i > 0 && <span style={{ margin: '0 6px', color: '#6c757d' }}>/</span>}
            {i === breadcrumb.length - 1 ? (
              <span style={{ fontWeight: 600, color: '#333' }}>{item.name}</span>
            ) : (
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(item)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#0070f3',
                  textDecoration: 'underline',
                  fontSize: 'inherit',
                }}
              >
                {item.name}
              </button>
            )}
          </span>
        ))}
      </nav>

      {!isRoot && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleBack}
          style={{ marginBottom: '16px' }}
        >
          ← Voltar
        </button>
      )}

      {showNewFolder && (
        <form onSubmit={handleCreateFolder} style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <div className="form-group">
            <label htmlFor="new-folder-name" className="form-label">
              Nome da pasta
            </label>
            <input
              id="new-folder-name"
              type="text"
              className="form-input"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: Trabalho"
              disabled={creating}
              autoFocus
            />
            {createError && <p className="error-message">{createError}</p>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Criando...' : 'Criar'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowNewFolder(false); setCreateError(null); setNewFolderName(''); }}
              disabled={creating}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p style={{ color: '#6c757d' }}>Carregando pastas...</p>
      ) : folders.length === 0 && !error ? (
        <p style={{ color: '#6c757d' }}>Nenhuma pasta aqui. Crie uma com &quot;Nova pasta&quot;.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {folders.map((folder) => (
            <li
              key={folder.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                border: '1px solid #eee',
                borderRadius: '6px',
                marginBottom: '8px',
                backgroundColor: '#fff',
              }}
            >
              <span style={{ fontWeight: 500 }}>📁 {folder.name}</span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleEnterFolder(folder)}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Entrar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
