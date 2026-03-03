'use client';

import { FolderOpen, Upload } from 'lucide-react';
import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
import { type Folder, type FolderFile } from '@/src/lib/api';

interface FileGridProps {
  folders: Folder[];
  files: FolderFile[];
  onFolderEnter: (folder: Folder) => void;
  onFolderRename: (folder: Folder) => void;
  onFolderMove: (folder: Folder) => void;
  onFolderDelete: (folder: Folder) => void;
  onFileDownload: (file: FolderFile) => void;
  onFilePreview: (file: FolderFile) => void;
  onFileDelete: (file: FolderFile) => void;
  downloadingFileId?: string | null;
  onUploadClick?: () => void;
}

export function FileGrid({
  folders,
  files,
  onFolderEnter,
  onFolderRename,
  onFolderMove,
  onFolderDelete,
  onFileDownload,
  onFilePreview,
  onFileDelete,
  downloadingFileId,
  onUploadClick,
}: FileGridProps) {
  return (
    <div className="space-y-6">
      {folders.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pastas ({folders.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onEnter={onFolderEnter}
                onRename={onFolderRename}
                onMove={onFolderMove}
                onDelete={onFolderDelete}
              />
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Arquivos ({files.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onDownload={onFileDownload}
                onPreview={onFilePreview}
                onDelete={onFileDelete}
                isDownloading={downloadingFileId === file.id}
              />
            ))}
          </div>
        </div>
      )}

      {folders.length === 0 && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground">Esta pasta está vazia</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Arraste arquivos para cá ou use o botão para começar.
          </p>
          {onUploadClick && (
            <button
              type="button"
              onClick={onUploadClick}
              className="mt-5 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Enviar arquivo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
