'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail } from 'lucide-react';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/src/components/ui';
import { FamilyHeader } from '@/src/features/family/components/FamilyHeader';
import { FamilyCreateCard } from '@/src/features/family/components/FamilyCreateCard';
import { useFamilySelection } from '@/src/features/family/hooks/useFamilySelection';

function FamilyInvitesPageContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const {
    families,
    selectedFamilyId,
    isLoadingFamilies,
    setSelectedFamilyId,
    createFamily,
    isCreatingFamily,
  } = useFamilySelection();

  const membersQuery = useQuery({
    queryKey: ['family-members', selectedFamilyId],
    queryFn: () => api.getFamilyMembers(selectedFamilyId as string),
    enabled: Boolean(selectedFamilyId),
  });

  const inviteMember = useMutation({
    mutationFn: ({ familyId, email }: { familyId: string; email: string }) =>
      api.inviteFamilyMember(familyId, email),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['family-members', selectedFamilyId] });
      setInviteEmail('');
      toast({
        title: 'Convite criado',
        description: 'O convite ficou pendente para este e-mail.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao convidar membro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pendingInvites = useMemo(
    () => membersQuery.data?.members.filter((member) => member.status === 'pending') ?? [],
    [membersQuery.data?.members]
  );

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

  const handleInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFamilyId) return;
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail) return;
    inviteMember.mutate({ familyId: selectedFamilyId, email: normalizedEmail });
  };

  return (
    <div className="flex h-full flex-col">
      <FamilyHeader
        title="Configurações da família"
        subtitle="Gerencie os convites enviados."
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Convidar membro</CardTitle>
                <CardDescription>Envie um novo convite para a família ativa.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">E-mail do membro</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="invite-email"
                          type="email"
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          className="pl-9"
                          placeholder="membro@email.com"
                        />
                      </div>
                      <Button type="submit" disabled={inviteMember.isPending}>
                        {inviteMember.isPending ? 'Enviando...' : 'Convidar'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Convites enviados (pendentes)</CardTitle>
                <CardDescription>Lista de convites que ainda não foram aceitos.</CardDescription>
              </CardHeader>
              <CardContent>
                {membersQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando convites...
                  </div>
                ) : pendingInvites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum convite pendente enviado.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="rounded-md border p-3">
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">Status: pendente</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function FamilyInvitesPageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function FamilyInvitesPage() {
  return (
    <Suspense fallback={<FamilyInvitesPageFallback />}>
      <FamilyInvitesPageContent />
    </Suspense>
  );
}
