'use client';

import { File, Download, MoreVertical, Eye } from 'lucide-react';
import { Button } from '@/src/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { type FolderFile } from '@/src/lib/api';
import { formatFileSize, formatDateShort } from '../utils/formatters';

interface FileCardProps {
  file: FolderFile;
  onDownload: (file: FolderFile) => void;
  onPreview: (file: FolderFile) => void;
  onDelete: (file: FolderFile) => void;
  isDownloading?: boolean;
}

export function FileCard({ file, onDownload, onPreview, onDelete, isDownloading }: FileCardProps) {
  return (
    <div className="group relative flex items-center gap-2 sm:gap-4 rounded-lg border bg-card px-3 py-2.5 sm:p-4 hover:bg-accent/50 transition-colors w-full overflow-hidden">
      <div
        className="shrink-0 cursor-pointer"
        onClick={() => onPreview(file)}
      >
        <File className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden cursor-pointer" onClick={() => onPreview(file)}>
        <h3 className="text-sm font-medium truncate" title={file.name}>
          {file.name}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {formatFileSize(file.size)} · {formatDateShort(file.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8"
          onClick={() => onDownload(file)}
          disabled={isDownloading}
          aria-label="Download"
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreview(file)}>
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(file)}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(file)} className="text-destructive">
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
