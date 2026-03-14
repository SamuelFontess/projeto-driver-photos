'use client';

import { Folder, MoreVertical, Star } from 'lucide-react';
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
import { cn } from '@/src/lib/utils';

interface FolderCardProps {
  folder: FolderType;
  onEnter: (folder: FolderType) => void;
  onRename: (folder: FolderType) => void;
  onMove: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
  onToggleFavorite?: (folder: FolderType) => void;
  isTogglingFavorite?: boolean;
}

export function FolderCard({
  folder,
  onEnter,
  onRename,
  onMove,
  onDelete,
  onToggleFavorite,
  isTogglingFavorite,
}: FolderCardProps) {
  const isFavorited = folder.isFavorited ?? false;

  return (
    <div
      className="group relative flex items-center gap-2 sm:gap-4 rounded-lg border bg-card px-3 py-2.5 sm:p-4 hover:bg-accent/60 hover:shadow-sm transition-all cursor-pointer w-full overflow-hidden"
      onClick={() => onEnter(folder)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onEnter(folder)}
      aria-label={`Abrir pasta ${folder.name}`}
    >
      <div className="shrink-0">
        <Folder className="h-6 w-6 sm:h-8 sm:w-8 text-primary" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <h3 className="text-sm font-medium truncate">{folder.name}</h3>
        <p className="text-xs text-muted-foreground truncate">
          {formatDateShort(folder.updatedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 sm:h-8 sm:w-8 touch-manipulation',
              'focus-visible:ring-2 focus-visible:ring-ring',
              'motion-safe:transition-colors',
              isFavorited
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-yellow-400'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(folder);
            }}
            aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-pressed={isFavorited}
            disabled={isTogglingFavorite}
          >
            <Star
              className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', isFavorited && 'fill-yellow-400')}
              aria-hidden="true"
            />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={(e) => e.stopPropagation()}
              aria-label="Mais opções"
            >
              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(folder); }}>
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(folder); }}>
              Mover
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(folder); }}
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
