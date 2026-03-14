import { useMemo } from 'react';
import { type Folder } from '@/src/lib/api';

export function useFavoriteFolders(folders: Folder[]): Folder[] {
  return useMemo(() => folders.filter((f) => f.isFavorited), [folders]);
}
