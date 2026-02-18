import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { useUpload } from '@/src/contexts/UploadContext';

export function useUploadFiles() {
  const { uploadFiles } = useUpload();
  
  // Wrap in useMutation to maintain compatibility with existing code structure
  // or just return the function. But useMutation gives us isPending state which is useful.
  // However, global state 'isUploading' might be better.
  
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
