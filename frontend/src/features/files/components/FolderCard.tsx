'use client';

import { Folder, MoreVertical } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
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
    <div className="group relative flex items-center gap-4 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
      <div className="flex-shrink-0">
        <Folder className="h-8 w-8 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{folder.name}</h3>
        <p className="text-sm text-muted-foreground">
          {formatDateShort(folder.updatedAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEnter(folder)}
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
