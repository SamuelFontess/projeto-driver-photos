'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api, type Folder, type FolderFile } from '@/src/lib/api';
import { logUxEvent, markUx, measureUx } from '@/src/lib/metrics/uxMetrics';
import { useToast } from '@/src/components/ui';

type BreadcrumbItem = { id: string | null; name: string };

async function buildBreadcrumb(folderId: string | null): Promise<BreadcrumbItem[]> {
  if (!folderId) return [{ id: null, name: 'Raiz' }];

  const chain: BreadcrumbItem[] = [];
  let cursor: string | null = folderId;
  let guard = 0;

  while (cursor && guard < 12) {
    const { folder } = await api.getFolder(cursor);
    chain.unshift({ id: folder.id, name: folder.name });
    cursor = folder.parentId;
    guard += 1;
  }

  return [{ id: null, name: 'Raiz' }, ...chain];
}

export function useFolderManager() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FolderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: null, name: 'Raiz' }]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const currentFolderId = searchParams.get('folder');

  const setFolderInUrl = useCallback(
    (folderId: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (!folderId) {
        next.delete('folder');
      } else {
        next.set('folder', folderId);
      }
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const loadFoldersAndFiles = useCallback(async (folderId: string | null) => {
    setLoading(true);
    setError(null);
    markUx('dashboard-content-start');

    try {
      const parent = folderId === undefined ? undefined : folderId;
      const [{ folders: list }, { files: fileList }, crumbs] = await Promise.all([
        api.getFolders(parent),
        api.getFiles(parent),
        buildBreadcrumb(folderId),
      ]);
      setFolders(list);
      setFiles(fileList);
      setBreadcrumb(crumbs);
      markUx('dashboard-content-end');
      const duration = measureUx('dashboard-content', 'dashboard-content-start', 'dashboard-content-end');
      logUxEvent('dashboard_content_loaded', {
        durationMs: duration,
        folderId: folderId ?? 'root',
        folderCount: list.length,
        fileCount: fileList.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conteúdo');
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFoldersAndFiles(currentFolderId);
  }, [currentFolderId, loadFoldersAndFiles]);

  const handleEnterFolder = (folder: Folder) => {
    setFolderInUrl(folder.id);
  };

  const handleBack = () => {
    if (breadcrumb.length <= 1) return;
    const previous = breadcrumb[breadcrumb.length - 2];
    setFolderInUrl(previous.id);
  };

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    setFolderInUrl(item.id);
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
    markUx('create-folder-start');
    try {
      await api.createFolder(name, currentFolderId);
      setNewFolderName('');
      setShowNewFolder(false);
      await loadFoldersAndFiles(currentFolderId);
      markUx('create-folder-end');
      const duration = measureUx('create-folder', 'create-folder-start', 'create-folder-end');
      logUxEvent('create_folder_success', { durationMs: duration });
      pushToast({
        title: 'Pasta criada',
        description: `A pasta "${name}" foi criada com sucesso.`,
        tone: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar pasta';
      setCreateError(message);
      pushToast({ title: 'Falha ao criar pasta', description: message, tone: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (file: FolderFile) => {
    if (downloadingId === file.id) return;
    setDownloadingId(file.id);
    markUx('download-start');
    try {
      const { blob, filename } = await api.downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? file.name;
      a.click();
      URL.revokeObjectURL(url);
      markUx('download-end');
      const duration = measureUx('download-file', 'download-start', 'download-end');
      logUxEvent('download_success', { durationMs: duration, fileId: file.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao baixar arquivo';
      setError(message);
      pushToast({ title: 'Falha no download', description: message, tone: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setUploadError(null);
    markUx('upload-start');
    try {
      await api.uploadFile(file, currentFolderId);
      await loadFoldersAndFiles(currentFolderId);
      if (fileInputRef.current) fileInputRef.current.value = '';
      markUx('upload-end');
      const duration = measureUx('upload-file', 'upload-start', 'upload-end');
      logUxEvent('upload_success', { durationMs: duration, size: file.size });
      pushToast({ title: 'Upload concluido', description: file.name, tone: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar arquivo';
      setUploadError(message);
      pushToast({ title: 'Falha no upload', description: message, tone: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (chosen) void handleUpload(chosen);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleUpload(file);
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

  const isRoot = breadcrumb.length <= 1;
  const openCreateFolder = () => {
    setShowNewFolder(true);
    setCreateError(null);
    setNewFolderName('');
  };
  const closeCreateFolder = () => {
    setShowNewFolder(false);
    setCreateError(null);
    setNewFolderName('');
  };

  return useMemo(
    () => ({
      folders,
      files,
      loading,
      error,
      showNewFolder,
      newFolderName,
      creating,
      createError,
      downloadingId,
      uploading,
      uploadError,
      isDragging,
      breadcrumb,
      fileInputRef,
      isRoot,
      setNewFolderName,
      openCreateFolder,
      closeCreateFolder,
      handleFileInputChange,
      handleEnterFolder,
      handleBack,
      handleBreadcrumbClick,
      handleCreateFolder,
      handleDownload,
      handleDrop,
      handleDragOver,
      handleDragLeave,
      clearUploadError: () => setUploadError(null),
    }),
    [
      breadcrumb,
      createError,
      creating,
      downloadingId,
      error,
      files,
      folders,
      isDragging,
      isRoot,
      loading,
      newFolderName,
      showNewFolder,
      uploadError,
      uploading,
    ]
  );
}
