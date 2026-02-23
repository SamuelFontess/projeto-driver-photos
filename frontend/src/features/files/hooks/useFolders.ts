import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/api';
import { type FileBrowserScope } from '../types';

function resolveFamilyId(scope: FileBrowserScope): string | undefined {
  return scope.type === 'family' ? scope.familyId : undefined;
}

export function useFolders(folderId: string | null, scope: FileBrowserScope) {
  const familyId = resolveFamilyId(scope);

  return useQuery({
    queryKey: ['folders', scope.type, familyId ?? null, folderId],
    queryFn: () => api.getFolders(folderId, { familyId }),
  });
}
