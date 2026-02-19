'use client';

import { Folder, File as FileIcon, Download, MoreVertical, Eye } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { type Folder as FolderType, type FolderFile } from '@/src/lib/api';
import { formatFileSize, formatDateShort } from '../utils/formatters';

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
}: FileListProps) {
  return (
    <div className="space-y-2">
      {folders.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Pastas</h2>
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <Folder className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onFolderEnter(folder)}>
                <h3 className="font-medium truncate">{folder.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDateShort(folder.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFolderEnter(folder)}
                >
                  Abrir
                </Button>
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
          <h2 className="mb-2 mt-4 text-sm font-semibold text-muted-foreground">Arquivos</h2>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div 
                className="flex-shrink-0 cursor-pointer"
                onClick={() => onFilePreview(file)}
              >
                <FileIcon className="h-5 w-5 text-muted-foreground" />
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
          ))}
        </>
      )}

      {folders.length === 0 && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            Esta pasta está vazia. Crie uma pasta ou envie arquivos para começar.
          </p>
        </div>
      )}
    </div>
  );
}
