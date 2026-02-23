import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { useUpload } from '@/src/contexts/UploadContext';
import { type FileBrowserScope } from '../types';

function resolveFamilyId(scope: FileBrowserScope): string | undefined {
  return scope.type === 'family' ? scope.familyId : undefined;
}

export function useUploadFiles(scope: FileBrowserScope) {
  const { uploadFiles } = useUpload();
  const familyId = resolveFamilyId(scope);
  
  return useMutation({
    mutationFn: ({ files, folderId }: { files: File[]; folderId: string | null }) =>
      uploadFiles(files, folderId, familyId),
  });
}

export function useDownloadFile(scope: FileBrowserScope) {
  const { toast } = useToast();
  const familyId = resolveFamilyId(scope);

  return useMutation({
    mutationFn: async (fileId: string) => {
      const { blob, filename } = await api.downloadFile(fileId, familyId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao baixar arquivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFile(scope: FileBrowserScope) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const familyId = resolveFamilyId(scope);

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; folderId?: string | null };
    }) => api.updateFile(id, data, familyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', scope.type, familyId ?? null] });
      queryClient.invalidateQueries({ queryKey: ['folders', scope.type, familyId ?? null] });
      toast({
        title: 'Arquivo atualizado',
        description: 'O arquivo foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar arquivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteFile(scope: FileBrowserScope) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const familyId = resolveFamilyId(scope);

  return useMutation({
    mutationFn: (id: string) => api.deleteFile(id, familyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', scope.type, familyId ?? null] });
      queryClient.invalidateQueries({ queryKey: ['folders', scope.type, familyId ?? null] });
      toast({
        title: 'Arquivo excluído',
        description: 'O arquivo foi excluído com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir arquivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
