'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFiles } from '../hooks/useFiles';
import { useFolders } from '../hooks/useFolders';
import { useUpdateFolder, useDeleteFolder } from '../hooks/useFolderActions';
import { useUploadFiles, useDownloadFile, useDeleteFile } from '../hooks/useFileActions';
import { useDialogState } from '../hooks/useDialogState';
import { FileActions } from './FileActions';
import { BreadcrumbNav } from './BreadcrumbNav';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { UploadZone } from './UploadZone';
import { FilePreviewModal } from './FilePreviewModal';
import { Header } from '@/src/components/layout/header';
import { useAuth } from '@/src/contexts/AuthContext';
import { Search, Users } from 'lucide-react';
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
import { Button, Skeleton } from '@/src/components/ui';
import { useToast } from '@/src/hooks/use-toast';
import { type Folder, type FolderFile } from '@/src/lib/api';
import { type BreadcrumbItem, type FileBrowserScope, type ViewMode } from '../types';
import { api } from '@/src/lib/api';

interface FileBrowserProps {
  scope?: FileBrowserScope;
  basePath?: string;
  showTopHeader?: boolean;
  familyName?: string;
}

function resolveFamilyId(scope: FileBrowserScope): string | undefined {
  return scope.type === 'family' ? scope.familyId : undefined;
}

export function FileBrowser({ scope = { type: 'user' }, basePath, showTopHeader = true, familyName }: FileBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFolderId = searchParams.get('folder') || null;
  const familyId = resolveFamilyId(scope);
  const rootPath = basePath ?? (scope.type === 'family' ? '/dashboard/family' : '/dashboard');

  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: null, name: 'Raiz' },
  ]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedSearchQuery = searchQuery.trim();
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [previewFile, setPreviewFile] = useState<FolderFile | null>(null);
  const dialogs = useDialogState();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: foldersData, isLoading: foldersLoading } = useFolders(currentFolderId, scope);
  const { data: filesData, isLoading: filesLoading } = useFiles(
    currentFolderId,
    scope,
    normalizedSearchQuery
  );
  
  // Mutations
  const updateFolder = useUpdateFolder(scope);
  const deleteFolder = useDeleteFolder(scope);
  const deleteFile = useDeleteFile(scope);
  const uploadFiles = useUploadFiles(scope);
  const downloadFile = useDownloadFile(scope);
  const { toast } = useToast();
  const { user } = useAuth();

  const folders = useMemo(() => foldersData?.folders ?? [], [foldersData]);
  const files = useMemo(() => filesData?.files ?? [], [filesData]);
  const isLoading = foldersLoading || filesLoading;

  // Sync breadcrumb with current folder
  useEffect(() => {
    let cancelled = false;

    const updateBreadcrumb = async () => {
      if (!currentFolderId) {
        setBreadcrumb([{ id: null, name: 'Raiz' }]);
        return;
      }

      try {
        const { folder } = await api.getFolder(currentFolderId, { familyId });
        if (!cancelled) {
          setBreadcrumb([
            { id: null, name: 'Raiz' },
            { id: folder.id, name: folder.name }
          ]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load folder details', error);
          router.push(rootPath);
        }
      }
    };

    updateBreadcrumb();
    return () => { cancelled = true; };
  }, [currentFolderId, familyId, rootPath, router]);

  // Filter based on search query
  const filteredFolders = useMemo(
    () => folders.filter((folder) =>
      folder.name.toLowerCase().includes(normalizedSearchQuery.toLowerCase())
    ),
    [folders, normalizedSearchQuery]
  );
  const filteredFiles = useMemo(() => files, [files]);

  const handleEnterFolder = useCallback((folder: Folder) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('folder', folder.id);
    router.push(`${rootPath}?${params.toString()}`);
  }, [rootPath, router, searchParams]);

  const handleBreadcrumbClick = useCallback((item: BreadcrumbItem) => {
    if (item.id === null) {
      router.push(rootPath);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set('folder', item.id);
      router.push(`${rootPath}?${params.toString()}`);
    }
  }, [rootPath, router, searchParams]);

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
    dialogs.rename.open(folder);
  }, [dialogs.rename]);

  const handleConfirmRename = useCallback(async () => {
    if (!dialogs.rename.folderId) return;
    const name = dialogs.rename.folderName.trim();
    if (!name) {
      toast({
        title: 'Erro',
        description: 'Digite um nome para a pasta.',
        variant: 'destructive',
      });
      return;
    }
    await updateFolder.mutateAsync({
      id: dialogs.rename.folderId,
      data: { name },
    });
    dialogs.rename.close();
  }, [dialogs.rename, updateFolder, toast]);

  const handleMove = useCallback(async (folder: Folder) => {
    dialogs.move.open(folder);
    try {
      const { folders: all } = await api.getFolders(null, { familyId });
      setAllFolders(all);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as pastas.',
        variant: 'destructive',
      });
    }
  }, [dialogs.move, familyId, toast]);

  const handleConfirmMove = useCallback(async () => {
    if (!dialogs.move.folderId) return;
    await updateFolder.mutateAsync({
      id: dialogs.move.folderId,
      data: { parentId: dialogs.move.targetParentId },
    });
    dialogs.move.close();
  }, [dialogs.move, updateFolder]);

  const handleDelete = useCallback((folder: Folder) => {
    dialogs.deleteFolder.open(folder);
  }, [dialogs.deleteFolder]);

  const handleFileDelete = useCallback((file: FolderFile) => {
    dialogs.deleteFile.open(file);
  }, [dialogs.deleteFile]);

  const handleConfirmDelete = useCallback(async () => {
    if (!dialogs.deleteFolder.folderId) return;
    await deleteFolder.mutateAsync(dialogs.deleteFolder.folderId);
    if (currentFolderId === dialogs.deleteFolder.folderId) {
      router.push(rootPath);
    }
    dialogs.deleteFolder.close();
  }, [dialogs.deleteFolder, deleteFolder, currentFolderId, rootPath, router]);

  const handleConfirmFileDelete = useCallback(async () => {
    if (!dialogs.deleteFile.fileId) return;
    await deleteFile.mutateAsync(dialogs.deleteFile.fileId);
    if (previewFile?.id === dialogs.deleteFile.fileId) {
      setPreviewFile(null);
    }
    dialogs.deleteFile.close();
  }, [dialogs.deleteFile, deleteFile, previewFile]);

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
      {showTopHeader ? (
        <Header
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          breadcrumbs={breadcrumb}
          onBreadcrumbClick={handleBreadcrumbClick}
        />
      ) : (
        /* Sub-bar compacta para contexto de família */
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background shrink-0">
          {scope.type === 'family' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium truncate max-w-[120px]">
                {familyName ?? 'Família'}
              </span>
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              name="search"
              autoComplete="off"
              aria-label="Buscar arquivos e pastas"
              placeholder="Buscar arquivos e pastas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {showTopHeader && (
          <p className="text-xl font-bold text-foreground mb-0.5">
            Olá, {displayName}!
          </p>
        )}
        {showTopHeader && (
          <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
            {scope.type === 'family'
              ? 'Gerencie as pastas e arquivos compartilhados da família.'
              : 'Gerencie suas pastas e arquivos abaixo.'}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <BreadcrumbNav items={breadcrumb} onItemClick={handleBreadcrumbClick} />
            <FileActions
              currentFolderId={currentFolderId}
              scope={scope}
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
                    downloadingFileId={downloadFile.isPending ? (downloadFile.variables ?? null) : null}
                    onUploadClick={handleUploadClick}
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
                    downloadingFileId={downloadFile.isPending ? (downloadFile.variables ?? null) : null}
                    onUploadClick={handleUploadClick}
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
      <Dialog open={!!dialogs.rename.folderId} onOpenChange={(open) => !open && dialogs.rename.close()}>
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
                value={dialogs.rename.folderName}
                onChange={(e) => dialogs.rename.setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={dialogs.rename.close}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmRename} disabled={updateFolder.isPending}>
              {updateFolder.isPending ? 'Renomeando…' : 'Renomear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={!!dialogs.move.folderId} onOpenChange={(open) => !open && dialogs.move.close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover pasta</DialogTitle>
            <DialogDescription>Selecione o destino para a pasta.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="move-target">Mover para</Label>
              <Select
                value={dialogs.move.targetParentId ?? 'root'}
                onValueChange={(value) => dialogs.move.setTargetParentId(value === 'root' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pasta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Raiz</SelectItem>
                  {getAvailableFolders(dialogs.move.folderId || '').map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={dialogs.move.close}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmMove} disabled={updateFolder.isPending}>
              {updateFolder.isPending ? 'Movendo…' : 'Mover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!dialogs.deleteFolder.folderId} onOpenChange={(open) => !open && dialogs.deleteFolder.close()}>
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
              {deleteFolder.isPending ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File Alert */}
      <AlertDialog open={!!dialogs.deleteFile.fileId} onOpenChange={(open) => !open && dialogs.deleteFile.close()}>
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
              {deleteFile.isPending ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
