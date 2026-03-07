'use client';

import { Download, MoreVertical, Eye } from 'lucide-react';
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
import { getFileIconConfig } from '../utils/fileIcons';

interface FileCardProps {
  file: FolderFile;
  onDownload: (file: FolderFile) => void;
  onPreview: (file: FolderFile) => void;
  onDelete: (file: FolderFile) => void;
  isDownloading?: boolean;
}

export function FileCard({ file, onDownload, onPreview, onDelete, isDownloading }: FileCardProps) {
  const { icon: FileIcon, className: iconClass } = getFileIconConfig(file.mimeType);
  return (
    <div className="group relative flex items-center gap-2 sm:gap-4 rounded-lg border bg-card px-3 py-2.5 sm:p-4 hover:bg-accent/60 hover:shadow-sm transition-all w-full overflow-hidden">
      <button
        type="button"
        className="flex flex-1 min-w-0 items-center gap-2 sm:gap-4 overflow-hidden text-left"
        onClick={() => onPreview(file)}
        aria-label={`Visualizar ${file.name}`}
      >
        <span className="shrink-0">
          <FileIcon className={`h-6 w-6 sm:h-8 sm:w-8 ${iconClass}`} aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0 overflow-hidden">
          <span className="block text-sm font-medium truncate" title={file.name}>
            {file.name}
          </span>
          <span className="block text-xs text-muted-foreground truncate">
            {formatFileSize(file.size)} · {formatDateShort(file.createdAt)}
          </span>
        </span>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8"
          onClick={() => onDownload(file)}
          disabled={isDownloading}
          aria-label="Download"
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" aria-label="Mais opções">
              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreview(file)}>
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(file)}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
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
