import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/api';

export function useFiles(folderId: string | null) {
  return useQuery({
    queryKey: ['files', folderId],
    queryFn: () => api.getFiles(folderId),
  });
}
