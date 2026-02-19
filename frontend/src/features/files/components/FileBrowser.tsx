'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFiles } from '../hooks/useFiles';
import { useFolders } from '../hooks/useFolders';
import { useCreateFolder, useUpdateFolder, useDeleteFolder } from '../hooks/useFolderActions';
import { useUploadFiles, useDownloadFile, useDeleteFile } from '../hooks/useFileActions';
import { FileActions } from './FileActions';
import { BreadcrumbNav } from './BreadcrumbNav';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { UploadZone } from './UploadZone';
import { FilePreviewModal } from './FilePreviewModal';
import { Header } from '@/src/components/layout/header';
import { useAuth } from '@/src/contexts/AuthContext';
import { Skeleton } from '@/src/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Button } from '@/src/components/ui';
import { useToast } from '@/src/hooks/use-toast';
import { type Folder, type FolderFile } from '@/src/lib/api';
import { type BreadcrumbItem, type ViewMode } from '../types';
import { api } from '@/src/lib/api';

export function FileBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFolderId = searchParams.get('folder') || null;

  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: null, name: 'Raiz' },
  ]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog States
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);
  const [moveTargetParentId, setMoveTargetParentId] = useState<string | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [previewFile, setPreviewFile] = useState<FolderFile | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: foldersData, isLoading: foldersLoading } = useFolders(currentFolderId);
  const { data: filesData, isLoading: filesLoading } = useFiles(currentFolderId);
  
  // Mutations
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const deleteFile = useDeleteFile();
  const uploadFiles = useUploadFiles();
  const downloadFile = useDownloadFile();
  const { toast } = useToast();
  const { user } = useAuth();

  const folders = foldersData?.folders || [];
  const files = filesData?.files || [];
  const isLoading = foldersLoading || filesLoading;

  // Sync breadcrumb with current folder
  useEffect(() => {
    const updateBreadcrumb = async () => {
      if (!currentFolderId) {
        setBreadcrumb([{ id: null, name: 'Raiz' }]);
        return;
      }

      try {
        const { folder } = await api.getFolder(currentFolderId);
        setBreadcrumb([
          { id: null, name: 'Raiz' },
          { id: folder.id, name: folder.name }
        ]);
      } catch (error) {
        console.error('Failed to load folder details', error);
        router.push('/dashboard');
      }
    };

    updateBreadcrumb();
  }, [currentFolderId, router]);

  // Filter based on search query
  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEnterFolder = useCallback((folder: Folder) => {
    const params = new URLSearchParams(searchParams);
    params.set('folder', folder.id);
    router.push(`/dashboard?${params.toString()}`);
  }, [router, searchParams]);

  const handleBreadcrumbClick = useCallback((item: BreadcrumbItem) => {
    if (item.id === null) {
      router.push('/dashboard');
    } else {
      const params = new URLSearchParams(searchParams);
      params.set('folder', item.id);
      router.push(`/dashboard?${params.toString()}`);
    }
  }, [router, searchParams]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        uploadFiles.mutate({
          files: Array.from(selectedFiles),
          folderId: currentFolderId,
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [currentFolderId, uploadFiles]
  );

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      uploadFiles.mutate({
        files,
        folderId: currentFolderId,
      });
    },
    [currentFolderId, uploadFiles]
  );

  const handleDownload = useCallback(
    (file: { id: string }) => {
      downloadFile.mutate(file.id);
    },
    [downloadFile]
  );
  
  const handlePreview = useCallback((file: FolderFile) => {
    setPreviewFile(file);
  }, []);

  const handleRename = useCallback((folder: Folder) => {
    setRenameFolderId(folder.id);
    setRenameFolderName(folder.name);
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (!renameFolderId) return;
    const name = renameFolderName.trim();
    if (!name) {
      toast({
        title: 'Erro',
        description: 'Digite um nome para a pasta.',
        variant: 'destructive',
      });
      return;
    }

    await updateFolder.mutateAsync({
      id: renameFolderId,
      data: { name },
    });
    setRenameFolderId(null);
    setRenameFolderName('');
  }, [renameFolderId, renameFolderName, updateFolder, toast]);

  const handleMove = useCallback(async (folder: Folder) => {
    setMoveFolderId(folder.id);
    setMoveTargetParentId(folder.parentId);
    // Carrega todas as pastas para o seletor de destino (chamada direta à API, sem hook)
    try {
      const { folders: all } = await api.getFolders(null);
      setAllFolders(all);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as pastas.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleConfirmMove = useCallback(async () => {
    if (!moveFolderId) return;
    await updateFolder.mutateAsync({
      id: moveFolderId,
      data: { parentId: moveTargetParentId },
    });
    setMoveFolderId(null);
    setMoveTargetParentId(null);
  }, [moveFolderId, moveTargetParentId, updateFolder]);

  const handleDelete = useCallback((folder: Folder) => {
    setDeleteFolderId(folder.id);
  }, []);

  const handleFileDelete = useCallback((file: FolderFile) => {
    setDeleteFileId(file.id);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteFolderId) return;
    await deleteFolder.mutateAsync(deleteFolderId);
    if (currentFolderId === deleteFolderId) {
       router.push('/dashboard');
    }
    setDeleteFolderId(null);
  }, [deleteFolderId, deleteFolder, currentFolderId, router]);

  const handleConfirmFileDelete = useCallback(async () => {
    if (!deleteFileId) return;
    await deleteFile.mutateAsync(deleteFileId);
    if (previewFile?.id === deleteFileId) {
      setPreviewFile(null);
    }
    setDeleteFileId(null);
  }, [deleteFileId, deleteFile, previewFile]);

  const getAvailableFolders = useCallback(
    (excludeId: string): Folder[] => {
      const excludeIds = new Set<string>([excludeId]);
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
    },
    [allFolders]
  );

  const displayName = user?.name?.trim() || 'Usuário';

  return (
    <div className="flex flex-col h-full">
      <Header
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        breadcrumbs={breadcrumb}
        onBreadcrumbClick={handleBreadcrumbClick}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-lg font-semibold text-foreground mb-1">
          Olá, {displayName}!
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Gerencie suas pastas e arquivos abaixo.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <BreadcrumbNav items={breadcrumb} onItemClick={handleBreadcrumbClick} />
            <FileActions
              currentFolderId={currentFolderId}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onUploadClick={handleUploadClick}
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            aria-hidden
          />
          <UploadZone
            onFilesSelected={handleFilesSelected}
            isUploading={uploadFiles.isPending}
          >
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <FileGrid
                    folders={filteredFolders}
                    files={filteredFiles}
                    onFolderEnter={handleEnterFolder}
                    onFolderRename={handleRename}
                    onFolderMove={handleMove}
                    onFolderDelete={handleDelete}
                    onFileDownload={handleDownload}
                    onFilePreview={handlePreview}
                    onFileDelete={handleFileDelete}
                    downloadingFileId={downloadFile.isPending ? 'pending' : null}
                  />
                ) : (
                  <FileList
                    folders={filteredFolders}
                    files={filteredFiles}
                    onFolderEnter={handleEnterFolder}
                    onFolderRename={handleRename}
                    onFolderMove={handleMove}
                    onFolderDelete={handleDelete}
                    onFileDownload={handleDownload}
                    onFilePreview={handlePreview}
                    onFileDelete={handleFileDelete}
                    downloadingFileId={downloadFile.isPending ? 'pending' : null}
                  />
                )}
              </>
            )}
          </UploadZone>
        </div>
      </div>

      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      {/* Rename Dialog */}
      <Dialog open={!!renameFolderId} onOpenChange={(open) => !open && setRenameFolderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
            <DialogDescription>Digite o novo nome para a pasta.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-name">Nome</Label>
              <Input
                id="rename-name"
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderId(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmRename} disabled={updateFolder.isPending}>
              {updateFolder.isPending ? 'Renomeando...' : 'Renomear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={!!moveFolderId} onOpenChange={(open) => !open && setMoveFolderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover pasta</DialogTitle>
            <DialogDescription>Selecione o destino para a pasta.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="move-target">Mover para</Label>
              <Select
                value={moveTargetParentId ?? 'root'}
                onValueChange={(value) => setMoveTargetParentId(value === 'root' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pasta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Raiz</SelectItem>
                  {getAvailableFolders(moveFolderId || '').map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveFolderId(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmMove} disabled={updateFolder.isPending}>
              {updateFolder.isPending ? 'Movendo...' : 'Mover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deleteFolderId} onOpenChange={(open) => !open && setDeleteFolderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta pasta? Todos os arquivos e subpastas dentro dela
              serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFolder.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File Alert */}
      <AlertDialog open={!!deleteFileId} onOpenChange={(open) => !open && setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este arquivo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFileDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFile.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
