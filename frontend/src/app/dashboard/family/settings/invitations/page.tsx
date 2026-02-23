'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui';
import { FamilyHeader } from '@/src/features/family/components/FamilyHeader';
import { FamilyCreateCard } from '@/src/features/family/components/FamilyCreateCard';
import { useFamilySelection } from '@/src/features/family/hooks/useFamilySelection';

export default function FamilyInvitationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    families,
    selectedFamilyId,
    isLoadingFamilies,
    setSelectedFamilyId,
    createFamily,
    isCreatingFamily,
  } = useFamilySelection();

  const invitationsQuery = useQuery({
    queryKey: ['family-invitations'],
    queryFn: () => api.getFamilyInvitations(),
  });

  const replyInvitation = useMutation({
    mutationFn: ({ invitationId, action }: { invitationId: string; action: 'accept' | 'decline' }) =>
      api.replyFamilyInvitation(invitationId, action),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['family-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['families'] }),
        queryClient.invalidateQueries({ queryKey: ['family-members'] }),
      ]);
      toast({
        title: 'Convite atualizado',
        description: 'A resposta ao convite foi registrada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao responder convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredInvitations = useMemo(() => {
    const invitations = invitationsQuery.data?.invitations ?? [];
    if (!selectedFamilyId) return invitations;
    return invitations.filter((invitation) => invitation.familyId === selectedFamilyId);
  }, [invitationsQuery.data?.invitations, selectedFamilyId]);

  const handleCreateFamily = async (name?: string) => {
    try {
      await createFamily(name);
      toast({
        title: 'Família pronta',
        description: 'Sua família foi criada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao criar família',
        description: error instanceof Error ? error.message : 'Erro ao criar família.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <FamilyHeader
        title="Configurações da família"
        subtitle="Convites pendentes para você."
        families={families}
        selectedFamilyId={selectedFamilyId}
        onFamilyChange={setSelectedFamilyId}
        showBackToFiles
      />

      <div className="flex-1 overflow-y-auto p-6">
        {isLoadingFamilies ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando famílias...
          </div>
        ) : !selectedFamilyId ? (
          <FamilyCreateCard onCreateFamily={handleCreateFamily} isCreating={isCreatingFamily} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Convites recebidos</CardTitle>
              <CardDescription>Aceite ou recuse convites enviados para sua conta.</CardDescription>
            </CardHeader>
            <CardContent>
              {invitationsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando convites...
                </div>
              ) : filteredInvitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você não possui convites pendentes.</p>
              ) : (
                <div className="space-y-3">
                  {filteredInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{invitation.family.name || 'Família sem nome'}</p>
                        <p className="text-sm text-muted-foreground">Convite para: {invitation.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            replyInvitation.mutate({ invitationId: invitation.id, action: 'accept' })
                          }
                          disabled={replyInvitation.isPending}
                        >
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            replyInvitation.mutate({ invitationId: invitation.id, action: 'decline' })
                          }
                          disabled={replyInvitation.isPending}
                        >
                          Recusar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
