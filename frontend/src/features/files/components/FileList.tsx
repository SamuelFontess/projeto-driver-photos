'use client';

import { Folder, Download, MoreVertical, Eye } from 'lucide-react';
import { Button } from '@/src/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { type Folder as FolderType, type FolderFile } from '@/src/lib/api';
import { EmptyFolderState } from './EmptyFolderState';
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
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onFolderEnter(folder)}
              aria-label={`Abrir pasta ${folder.name}`}
            >
              <Folder className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{folder.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDateShort(folder.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Mais opções">
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
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
                <button
                  type="button"
                  className="flex flex-1 min-w-0 items-center gap-4 text-left overflow-hidden"
                  onClick={() => onFilePreview(file)}
                  aria-label={`Visualizar ${file.name}`}
                >
                  <FileTypeIcon className={`h-5 w-5 flex-shrink-0 ${iconClass}`} aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {formatFileSize(file.size)} · {formatDateShort(file.createdAt)}
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileDownload(file)}
                    disabled={downloadingFileId === file.id}
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    {downloadingFileId === file.id ? 'Baixando…' : 'Download'}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Mais opções">
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onFilePreview(file)}>
                        <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onFileDownload(file)}>
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
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
        <EmptyFolderState onUploadClick={onUploadClick} />
      )}
    </div>
  );
}
