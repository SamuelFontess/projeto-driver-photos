'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, type Folder, type FolderFile } from '@/src/lib/api';

type BreadcrumbItem = { id: string | null; name: string };

// Status de cada arquivo durante o upload
type UploadItemStatus = 'pending' | 'uploading' | 'done' | 'error';

interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  errorMessage?: string;
}

// Formata bytes em KB/MB para exibição
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Formata data ISO para exibição local
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

let uploadIdCounter = 0;

export function FolderManager() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: null, name: 'Raiz' }]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FolderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fila de upload com status por arquivo
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const isUploading = uploadQueue.some((item) => item.status === 'uploading' || item.status === 'pending');

  const loadFoldersAndFiles = useCallback(async (parentId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const parent = parentId === undefined ? undefined : parentId;
      const [{ folders: list }, { files: fileList }] = await Promise.all([
        api.getFolders(parent),
        api.getFiles(parent),
      ]);
      setFolders(list);
      setFiles(fileList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conteúdo');
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFoldersAndFiles(currentFolderId);
  }, [currentFolderId, loadFoldersAndFiles]);

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
      await loadFoldersAndFiles(currentFolderId);
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

  const handleDownload = async (file: FolderFile) => {
    if (downloadingId === file.id) return;
    setDownloadingId(file.id);
    try {
      const { blob, filename } = await api.downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar arquivo');
    } finally {
      setDownloadingId(null);
    }
  };

  // Envia múltiplos arquivos em uma única request
  // Atualiza o status de cada item na fila conforme o progresso
  const processUpload = useCallback(async (items: UploadItem[], folderId: string | null) => {
    const itemIds = items.map((i) => i.id);

    // Marca todos como "uploading"
    setUploadQueue((prev) =>
      prev.map((item) =>
        itemIds.includes(item.id) ? { ...item, status: 'uploading' as const } : item
      )
    );

    try {
      const filesToSend = items.map((i) => i.file);
      await api.uploadFiles(filesToSend, folderId);

      // Marca todos como "done"
      setUploadQueue((prev) =>
        prev.map((item) =>
          itemIds.includes(item.id) ? { ...item, status: 'done' as const } : item
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar arquivo';
      // Marca todos como "error"
      setUploadQueue((prev) =>
        prev.map((item) =>
          itemIds.includes(item.id)
            ? { ...item, status: 'error' as const, errorMessage: message }
            : item
        )
      );
    }

    // Recarrega a lista de arquivos após o upload
    await loadFoldersAndFiles(folderId);
  }, [loadFoldersAndFiles]);

  // Adiciona arquivos à fila e inicia o upload
  const handleUploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    const maxPerBatch = 20;
    const newItems: UploadItem[] = filesArray.map((file) => ({
      id: `upload-${++uploadIdCounter}`,
      file,
      status: 'pending' as const,
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);

    // Divide em lotes de 20 (limite do backend) e envia sequencialmente
    for (let i = 0; i < newItems.length; i += maxPerBatch) {
      const batch = newItems.slice(i, i + maxPerBatch);
      await processUpload(batch, currentFolderId);
    }

    // Limpa o input para permitir selecionar os mesmos arquivos novamente
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [currentFolderId, processUpload]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files;
    if (chosen && chosen.length > 0) handleUploadFiles(chosen);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) handleUploadFiles(droppedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Remove itens finalizados (done ou error) da fila de upload
  const clearFinishedUploads = () => {
    setUploadQueue((prev) => prev.filter((item) => item.status === 'pending' || item.status === 'uploading'));
  };

  const isRoot = breadcrumb.length <= 1;
  const hasFinished = uploadQueue.some((item) => item.status === 'done' || item.status === 'error');

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Minhas pastas</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            disabled={isUploading}
            style={{ display: 'none' }}
            aria-hidden
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { fileInputRef.current?.click(); }}
            disabled={isUploading}
          >
            {isUploading ? 'Enviando...' : 'Enviar arquivos'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { setShowNewFolder(true); setCreateError(null); setNewFolderName(''); }}
          >
            Nova pasta
          </button>
        </div>
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

      {/* Painel de progresso do upload múltiplo */}
      {uploadQueue.length > 0 && (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e9ecef',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
              Upload de arquivos
              {isUploading && (
                <span style={{ fontWeight: 400, color: '#6c757d', marginLeft: '8px' }}>
                  ({uploadQueue.filter((i) => i.status === 'done').length}/{uploadQueue.length} concluídos)
                </span>
              )}
            </h4>
            {hasFinished && !isUploading && (
              <button
                type="button"
                onClick={clearFinishedUploads}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Limpar lista
              </button>
            )}
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
            {uploadQueue.map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  marginBottom: '4px',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  fontSize: '14px',
                }}
              >
                {/* Ícone de status */}
                <span style={{ flexShrink: 0, width: '20px', textAlign: 'center' }}>
                  {item.status === 'pending' && (
                    <span style={{ color: '#6c757d' }} title="Aguardando">⏳</span>
                  )}
                  {item.status === 'uploading' && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: '2px solid #e9ecef',
                        borderTopColor: '#0070f3',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                      title="Enviando"
                    />
                  )}
                  {item.status === 'done' && (
                    <span style={{ color: '#28a745' }} title="Concluído">✓</span>
                  )}
                  {item.status === 'error' && (
                    <span style={{ color: '#dc3545' }} title="Erro">✗</span>
                  )}
                </span>

                {/* Nome e tamanho */}
                <span
                  style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: item.status === 'error' ? '#dc3545' : '#333',
                  }}
                  title={item.file.name}
                >
                  {item.file.name}
                </span>

                <span style={{ color: '#6c757d', fontSize: '13px', flexShrink: 0 }}>
                  {formatSize(item.file.size)}
                </span>

                {/* Mensagem de erro */}
                {item.status === 'error' && item.errorMessage && (
                  <span style={{ color: '#dc3545', fontSize: '12px', flexShrink: 0 }} title={item.errorMessage}>
                    Falha
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6c757d' }}>Carregando pastas e arquivos...</p>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            padding: isDragging ? '32px 16px' : undefined,
            border: isDragging ? '2px dashed #0070f3' : '2px dashed transparent',
            borderRadius: '6px',
            backgroundColor: isDragging ? 'rgba(0, 112, 243, 0.05)' : undefined,
            transition: 'border-color 0.15s, background-color 0.15s, padding 0.15s',
            minHeight: '80px',
          }}
        >
          {isDragging && (
            <p style={{ color: '#0070f3', margin: '0 0 12px', fontWeight: 500, textAlign: 'center' }}>
              Solte os arquivos aqui para enviar
            </p>
          )}
          {folders.length === 0 && files.length === 0 && !error ? (
            <p style={{ color: '#6c757d' }}>Nenhuma pasta nem arquivo aqui. Crie uma pasta com &quot;Nova pasta&quot; ou arraste arquivos para enviar.</p>
          ) : (
            <>
              {folders.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '16px' }}>
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

              <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600 }}>Arquivos</h3>
              {files.length === 0 ? (
                <p style={{ color: '#6c757d', margin: 0 }}>Nenhum arquivo nesta pasta.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {files.map((file) => (
                    <li
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: '1px solid #eee',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        backgroundColor: '#fff',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 500, flex: '1 1 auto', minWidth: 0 }} title={file.name}>
                        📄 {file.name}
                      </span>
                      <span style={{ color: '#6c757d', fontSize: '14px', flexShrink: 0 }}>
                        {formatSize(file.size)} · {formatDate(file.createdAt)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id}
                        style={{ padding: '8px 16px', fontSize: '14px', flexShrink: 0 }}
                      >
                        {downloadingId === file.id ? 'Baixando...' : 'Download'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
