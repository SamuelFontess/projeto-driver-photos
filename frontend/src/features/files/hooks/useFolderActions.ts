import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { type FileBrowserScope } from '../types';

function resolveFamilyId(scope: FileBrowserScope): string | undefined {
  return scope.type === 'family' ? scope.familyId : undefined;
}

export function useCreateFolder(scope: FileBrowserScope) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const familyId = resolveFamilyId(scope);

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      api.createFolder(name, parentId, { familyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', scope.type, familyId ?? null] });
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

export function useUpdateFolder(scope: FileBrowserScope) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const familyId = resolveFamilyId(scope);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; parentId?: string | null } }) =>
      api.updateFolder(id, data, { familyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', scope.type, familyId ?? null] });
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

export function useDeleteFolder(scope: FileBrowserScope) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const familyId = resolveFamilyId(scope);

  return useMutation({
    mutationFn: (id: string) => api.deleteFolder(id, { familyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', scope.type, familyId ?? null] });
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
