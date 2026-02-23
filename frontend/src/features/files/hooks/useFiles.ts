import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/api';
import { type FileBrowserScope } from '../types';

function resolveFamilyId(scope: FileBrowserScope): string | undefined {
  return scope.type === 'family' ? scope.familyId : undefined;
}

export function useFiles(folderId: string | null, scope: FileBrowserScope, search?: string) {
  const familyId = resolveFamilyId(scope);
  const normalizedSearch = search?.trim() || undefined;

  return useQuery({
    queryKey: ['files', scope.type, familyId ?? null, folderId, normalizedSearch],
    queryFn: () =>
      api.getFiles({
        folderId,
        familyId,
        search: normalizedSearch,
      }),
  });
}
