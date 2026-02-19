import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/api';

export function useFiles(folderId: string | null, search?: string) {
  const normalizedSearch = search?.trim() || undefined;

  return useQuery({
    queryKey: ['files', folderId, normalizedSearch],
    queryFn: () =>
      api.getFiles({
        folderId,
        search: normalizedSearch,
      }),
  });
}
