'use client';

import { Folder, Download, MoreVertical, Eye, FolderOpen, Upload } from 'lucide-react';
import { Button } from '@/src/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { type Folder as FolderType, type FolderFile } from '@/src/lib/api';
import { formatFileSize, formatDateShort } from '../utils/formatters';
import { getFileIconConfig } from '../utils/fileIcons';

interface FileListProps {
  folders: FolderType[];
  files: FolderFile[];
  onFolderEnter: (folder: FolderType) => void;
  onFolderRename: (folder: FolderType) => void;
  onFolderMove: (folder: FolderType) => void;
  onFolderDelete: (folder: FolderType) => void;
  onFileDownload: (file: FolderFile) => void;
  onFilePreview: (file: FolderFile) => void;
  onFileDelete: (file: FolderFile) => void;
  downloadingFileId?: string | null;
  onUploadClick?: () => void;
}

export function FileList({
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
}: FileListProps) {
  return (
    <div className="space-y-2">
      {folders.length > 0 && (
        <>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pastas ({folders.length})
          </h2>
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:bg-accent/60 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => onFolderEnter(folder)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onFolderEnter(folder)}
              aria-label={`Abrir pasta ${folder.name}`}
            >
              <Folder className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{folder.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDateShort(folder.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onFolderRename(folder)}>
                      Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFolderMove(folder)}>
                      Mover
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onFolderDelete(folder)}
                      className="text-destructive"
                    >
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </>
      )}

      {files.length > 0 && (
        <>
          <h2 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Arquivos ({files.length})
          </h2>
          {files.map((file) => {
            const { icon: FileTypeIcon, className: iconClass } = getFileIconConfig(file.mimeType);
            return (
              <div
                key={file.id}
                className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:bg-accent/60 hover:shadow-sm transition-all"
              >
                <div
                  className="flex-shrink-0 cursor-pointer"
                  onClick={() => onFilePreview(file)}
                >
                  <FileTypeIcon className={`h-5 w-5 ${iconClass}`} />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onFilePreview(file)}>
                  <h3 className="font-medium truncate" title={file.name}>
                    {file.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} · {formatDateShort(file.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileDownload(file)}
                    disabled={downloadingFileId === file.id}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {downloadingFileId === file.id ? 'Baixando...' : 'Download'}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onFilePreview(file)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onFileDownload(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onFileDelete(file)}
                        className="text-destructive"
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </>
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
