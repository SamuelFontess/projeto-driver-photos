import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/api';

export function useFolders(folderId: string | null) {
  return useQuery({
    queryKey: ['folders', folderId],
    queryFn: () => api.getFolders(folderId),
  });
}
