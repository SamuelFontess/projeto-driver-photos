import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';

export function useCreateFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      api.createFolder(name, parentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders', variables.parentId] });
      toast({
        title: 'Pasta criada',
        description: 'A pasta foi criada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar pasta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; parentId?: string | null } }) =>
      api.updateFolder(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast({
        title: 'Pasta atualizada',
        description: 'A pasta foi atualizada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar pasta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast({
        title: 'Pasta excluída',
        description: 'A pasta foi excluída com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir pasta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
