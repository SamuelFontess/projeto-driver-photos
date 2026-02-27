'use client';

import { Folder, MoreVertical, ChevronRight } from 'lucide-react';
import { Button } from '@/src/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { type Folder as FolderType } from '@/src/lib/api';
import { formatDateShort } from '../utils/formatters';

interface FolderCardProps {
  folder: FolderType;
  onEnter: (folder: FolderType) => void;
  onRename: (folder: FolderType) => void;
  onMove: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
}

export function FolderCard({
  folder,
  onEnter,
  onRename,
  onMove,
  onDelete,
}: FolderCardProps) {
  return (
    <div className="group relative flex items-center gap-2 sm:gap-4 rounded-lg border bg-card px-3 py-2.5 sm:p-4 hover:bg-accent/50 transition-colors w-full overflow-hidden">
      <div className="shrink-0">
        <Folder className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <h3 className="text-sm font-medium truncate">{folder.name}</h3>
        <p className="text-xs text-muted-foreground truncate">
          {formatDateShort(folder.updatedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8"
          onClick={() => onEnter(folder)}
          aria-label="Abrir pasta"
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(folder)}>
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(folder)}>
              Mover
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(folder)}
              className="text-destructive"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
