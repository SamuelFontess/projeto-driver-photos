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
    <div className="group relative flex items-center gap-4 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
      <div 
        className="flex-shrink-0 cursor-pointer"
        onClick={() => onPreview(file)}
      >
        <File className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onPreview(file)}>
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
          onClick={() => onDownload(file)}
          disabled={isDownloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Baixando...' : 'Download'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
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
