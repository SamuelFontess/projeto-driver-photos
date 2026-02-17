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

  // Estados para menu de opções e modais
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);
  const [moveTargetParentId, setMoveTargetParentId] = useState<string | null>(null);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [loadingFoldersForMove, setLoadingFoldersForMove] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

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

  // Carrega todas as pastas recursivamente para o modal de mover
  const loadAllFolders = useCallback(async () => {
    setLoadingFoldersForMove(true);
    try {
      const all: Folder[] = [];
      const loadRecursive = async (parentId: string | null = null) => {
        const { folders } = await api.getFolders(parentId);
        all.push(...folders);
        // Carrega filhos recursivamente
        await Promise.all(folders.map((folder) => loadRecursive(folder.id)));
      };
      await loadRecursive(null);
      setAllFolders(all);
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Erro ao carregar pastas');
    } finally {
      setLoadingFoldersForMove(false);
    }
  }, []);

  // Abre modal de renomear
  const handleOpenRename = (folder: Folder) => {
    setRenameFolderId(folder.id);
    setRenameFolderName(folder.name);
    setRenameError(null);
    setOpenMenuId(null);
  };

  // Confirma renomear pasta
  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFolderId) return;
    const name = renameFolderName.trim();
    if (!name) {
      setRenameError('Digite um nome para a pasta.');
      return;
    }
    setRenaming(true);
    setRenameError(null);
    try {
      await api.updateFolder(renameFolderId, { name });
      setRenameFolderId(null);
      setRenameFolderName('');
      // Atualiza breadcrumb se a pasta renomeada está no caminho atual
      setBreadcrumb((prev) =>
        prev.map((item) => (item.id === renameFolderId ? { ...item, name } : item))
      );
      await loadFoldersAndFiles(currentFolderId);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Erro ao renomear pasta');
    } finally {
      setRenaming(false);
    }
  };

  // Abre modal de mover
  const handleOpenMove = async (folder: Folder) => {
    setMoveFolderId(folder.id);
    setMoveTargetParentId(folder.parentId);
    setMoveError(null);
    setOpenMenuId(null);
    await loadAllFolders();
  };

  // Confirma mover pasta
  const handleConfirmMove = async () => {
    if (!moveFolderId) return;
    setMoving(true);
    setMoveError(null);
    try {
      await api.updateFolder(moveFolderId, { parentId: moveTargetParentId });
      setMoveFolderId(null);
      setMoveTargetParentId(null);
      // Se a pasta movida está no caminho atual, atualiza breadcrumb
      const movedFolder = folders.find((f) => f.id === moveFolderId);
      if (movedFolder && breadcrumb.some((b) => b.id === moveFolderId)) {
        // Se movemos uma pasta que está no breadcrumb, volta para raiz
        setBreadcrumb([{ id: null, name: 'Raiz' }]);
        setCurrentFolderId(null);
      } else {
        await loadFoldersAndFiles(currentFolderId);
      }
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Erro ao mover pasta');
    } finally {
      setMoving(false);
    }
  };

  // Abre confirmação de deletar
  const handleOpenDelete = (folder: Folder) => {
    setDeleteFolderId(folder.id);
    setOpenMenuId(null);
  };

  // Confirma deletar pasta
  const handleConfirmDelete = async () => {
    if (!deleteFolderId) return;
    setDeleting(true);
    try {
      await api.deleteFolder(deleteFolderId);
      setDeleteFolderId(null);
      // Se a pasta deletada está no caminho atual, volta para raiz
      if (breadcrumb.some((b) => b.id === deleteFolderId)) {
        setBreadcrumb([{ id: null, name: 'Raiz' }]);
        setCurrentFolderId(null);
      } else {
        await loadFoldersAndFiles(currentFolderId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar pasta');
      setDeleteFolderId(null);
    } finally {
      setDeleting(false);
    }
  };

  // Filtra pastas que podem ser destino (exclui a pasta sendo movida e seus descendentes)
  const getAvailableFolders = (excludeId: string): Folder[] => {
    const excludeIds = new Set<string>([excludeId]);
    // Adiciona descendentes recursivamente
    const addDescendants = (parentId: string) => {
      allFolders.forEach((f) => {
        if (f.parentId === parentId && !excludeIds.has(f.id)) {
          excludeIds.add(f.id);
          addDescendants(f.id);
        }
      });
    };
    addDescendants(excludeId);
    return allFolders.filter((f) => !excludeIds.has(f.id));
  };

  // Formata nome da pasta com hierarquia para exibição
  const getFolderDisplayName = (folder: Folder): string => {
    const path: string[] = [];
    let current: Folder | undefined = folder;
    const folderMap = new Map(allFolders.map((f) => [f.id, f]));
    
    while (current) {
      path.unshift(current.name);
      current = current.parentId ? folderMap.get(current.parentId) : undefined;
    }
    
    return path.join(' / ');
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
                        position: 'relative',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 500, flex: '1 1 auto', minWidth: 0 }} title={folder.name}>
                        📁 {folder.name}
                      </span>
                      <span style={{ color: '#6c757d', fontSize: '14px', flexShrink: 0 }}>
                        {folder.childrenCount !== undefined && folder.filesCount !== undefined ? (
                          <>
                            {folder.childrenCount} {folder.childrenCount === 1 ? 'pasta' : 'pastas'}, {folder.filesCount} {folder.filesCount === 1 ? 'arquivo' : 'arquivos'} · {formatDate(folder.updatedAt)}
                          </>
                        ) : (
                          formatDate(folder.updatedAt)
                        )}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleEnterFolder(folder)}
                          style={{ padding: '8px 16px', fontSize: '14px' }}
                        >
                          Entrar
                        </button>
                        <div ref={openMenuId === folder.id ? menuRef : null} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === folder.id ? null : folder.id)}
                            style={{
                              padding: '8px 12px',
                              fontSize: '14px',
                              background: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#333',
                            }}
                            aria-label="Opções da pasta"
                          >
                            ⋮
                          </button>
                          {openMenuId === folder.id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '4px',
                                backgroundColor: '#fff',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                zIndex: 1000,
                                minWidth: '160px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenRename(folder)}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  padding: '10px 16px',
                                  textAlign: 'left',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  color: '#333',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                Renomear
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenMove(folder)}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  padding: '10px 16px',
                                  textAlign: 'left',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  color: '#333',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                Mover
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(folder)}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  padding: '10px 16px',
                                  textAlign: 'left',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  color: '#dc3545',
                                  borderTop: '1px solid #dee2e6',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
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

      {/* Modal de Renomear */}
      {renameFolderId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            if (!renaming) {
              setRenameFolderId(null);
              setRenameFolderName('');
              setRenameError(null);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem' }}>Renomear pasta</h3>
            <form onSubmit={handleConfirmRename}>
              <div className="form-group">
                <label htmlFor="rename-folder-name" className="form-label">
                  Novo nome
                </label>
                <input
                  id="rename-folder-name"
                  type="text"
                  className="form-input"
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  placeholder="Nome da pasta"
                  disabled={renaming}
                  autoFocus
                />
                {renameError && <p className="error-message">{renameError}</p>}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setRenameFolderId(null);
                    setRenameFolderName('');
                    setRenameError(null);
                  }}
                  disabled={renaming}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={renaming}>
                  {renaming ? 'Renomeando...' : 'Renomear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Mover */}
      {moveFolderId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            if (!moving && !loadingFoldersForMove) {
              setMoveFolderId(null);
              setMoveTargetParentId(null);
              setMoveError(null);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem' }}>Mover pasta</h3>
            {loadingFoldersForMove ? (
              <p style={{ color: '#6c757d' }}>Carregando pastas...</p>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="move-folder-target" className="form-label">
                    Mover para
                  </label>
                  <select
                    id="move-folder-target"
                    className="form-input"
                    value={moveTargetParentId ?? ''}
                    onChange={(e) => setMoveTargetParentId(e.target.value === '' ? null : e.target.value)}
                    disabled={moving}
                  >
                    <option value="">Raiz</option>
                    {getAvailableFolders(moveFolderId)
                      .sort((a, b) => getFolderDisplayName(a).localeCompare(getFolderDisplayName(b)))
                      .map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {getFolderDisplayName(folder)}
                        </option>
                      ))}
                  </select>
                  {moveError && <p className="error-message">{moveError}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setMoveFolderId(null);
                      setMoveTargetParentId(null);
                      setMoveError(null);
                    }}
                    disabled={moving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmMove}
                    disabled={moving}
                  >
                    {moving ? 'Movendo...' : 'Mover'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmar Exclusão */}
      {deleteFolderId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            if (!deleting) {
              setDeleteFolderId(null);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', color: '#dc3545' }}>Excluir pasta</h3>
            <p style={{ margin: '0 0 24px', color: '#333' }}>
              Tem certeza que deseja excluir esta pasta? Todos os arquivos e subpastas dentro dela serão
              excluídos permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteFolderId(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
