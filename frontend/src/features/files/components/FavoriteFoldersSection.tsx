'use client';

import { Star } from 'lucide-react';
import { FolderCard } from './FolderCard';
import { type Folder } from '@/src/lib/api';
import { type ViewMode } from '../types';

interface FavoriteFoldersSectionProps {
  folders: Folder[];
  viewMode: ViewMode;
  onEnter: (folder: Folder) => void;
  onRename: (folder: Folder) => void;
  onMove: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onToggleFavorite: (folder: Folder) => void;
  togglingFavoriteId?: string | null;
}

export function FavoriteFoldersSection({
  folders,
  viewMode,
  onEnter,
  onRename,
  onMove,
  onDelete,
  onToggleFavorite,
  togglingFavoriteId,
}: FavoriteFoldersSectionProps) {
  if (folders.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">
          Favoritos ({folders.length})
        </h2>
      </div>
      <div
        className={
          viewMode === 'grid'
            ? 'grid gap-3 md:grid-cols-2 lg:grid-cols-3'
            : 'space-y-2'
        }
      >
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            onEnter={onEnter}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            isTogglingFavorite={togglingFavoriteId === folder.id}
          />
        ))}
      </div>
    </div>
  );
}
