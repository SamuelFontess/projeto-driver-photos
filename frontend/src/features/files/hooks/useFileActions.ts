import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { useUpload } from '@/src/contexts/UploadContext';

export function useUploadFiles() {
  const { uploadFiles } = useUpload();
  
  return useMutation({
    mutationFn: ({ files, folderId }: { files: File[]; folderId: string | null }) =>
      uploadFiles(files, folderId),
  });
}

export function useDownloadFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const { blob, filename } = await api.downloadFile(fileId);
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

export function useUpdateFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; folderId?: string | null };
    }) => api.updateFile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
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

export function useDeleteFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
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
