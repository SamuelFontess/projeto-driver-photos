'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, Trash2, UserMinus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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

function getMemberDisplay(name: string | null | undefined, email: string): string {
  return name?.trim() || email;
}

function FamilySettingsPageContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [familyName, setFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const {
    families,
    selectedFamilyId,
    selectedFamily,
    isLoadingFamilies,
    setSelectedFamilyId,
    createFamily,
    isCreatingFamily,
  } = useFamilySelection();

  const isOwner = Boolean(selectedFamily && user && selectedFamily.ownerId === user.id);

  useEffect(() => {
    setFamilyName(selectedFamily?.name ?? '');
  }, [selectedFamily]);

  const membersQuery = useQuery({
    queryKey: ['family-members', selectedFamilyId],
    queryFn: () => api.getFamilyMembers(selectedFamilyId as string),
    enabled: Boolean(selectedFamilyId),
  });

  const invitationsQuery = useQuery({
    queryKey: ['family-invitations'],
    queryFn: () => api.getFamilyInvitations(),
  });

  const updateFamily = useMutation({
    mutationFn: ({ familyId, name }: { familyId: string; name: string | null }) =>
      api.updateFamily(familyId, name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['families'] });
      toast({ title: 'Família atualizada', description: 'Nome salvo com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const inviteMember = useMutation({
    mutationFn: ({ familyId, email }: { familyId: string; email: string }) =>
      api.inviteFamilyMember(familyId, email),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['family-members', selectedFamilyId] });
      setInviteEmail('');
      toast({ title: 'Convite enviado', description: 'O convite ficou pendente para este e-mail.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao convidar', description: error.message, variant: 'destructive' });
    },
  });

  const removeMember = useMutation({
    mutationFn: ({ familyId, userId }: { familyId: string; userId: string }) =>
      api.removeFamilyMember(familyId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['family-members', selectedFamilyId] });
      toast({ title: 'Membro removido', description: 'O membro foi removido da família.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
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
      toast({ title: 'Convite atualizado', description: 'A resposta foi registrada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao responder', description: error.message, variant: 'destructive' });
    },
  });

  const deleteFamily = useMutation({
    mutationFn: (familyId: string) => api.deleteFamily(familyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['families'] });
      toast({ title: 'Família excluída', description: 'A família foi removida permanentemente.' });
      router.push('/dashboard/family');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  const acceptedMembers = useMemo(
    () => membersQuery.data?.members.filter((m) => m.status === 'accepted') ?? [],
    [membersQuery.data?.members]
  );

  const pendingInvites = useMemo(
    () => membersQuery.data?.members.filter((m) => m.status === 'pending') ?? [],
    [membersQuery.data?.members]
  );

  const receivedInvitations = invitationsQuery.data?.invitations ?? [];

  const handleCreateFamily = async (name?: string) => {
    try {
      await createFamily(name);
      toast({ title: 'Família criada', description: 'Sua família foi criada com sucesso.' });
    } catch (error) {
      toast({
        title: 'Erro ao criar família',
        description: error instanceof Error ? error.message : 'Erro ao criar família.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateNewFamily = async () => {
    try {
      await createFamily();
      toast({ title: 'Nova família criada', description: 'Uma nova família foi criada.' });
    } catch (error) {
      toast({
        title: 'Erro ao criar família',
        description: error instanceof Error ? error.message : 'Erro ao criar família.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateFamily = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFamilyId) return;
    updateFamily.mutate({ familyId: selectedFamilyId, name: familyName.trim() || null });
  };

  const handleInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFamilyId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    inviteMember.mutate({ familyId: selectedFamilyId, email });
  };

  return (
    <div className="flex h-full flex-col">
      <FamilyHeader
        title="Configurações da família"
        subtitle="Gerencie membros, convites e informações da família."
        families={families}
        selectedFamilyId={selectedFamilyId}
        onFamilyChange={setSelectedFamilyId}
        onCreateFamily={handleCreateNewFamily}
        showBackToFiles
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoadingFamilies ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando famílias...
          </div>
        ) : !selectedFamilyId ? (
          <FamilyCreateCard onCreateFamily={handleCreateFamily} isCreating={isCreatingFamily} />
        ) : (
          <div className="space-y-6">

            {/* Seção 1: Informações (apenas owner) */}
            {isOwner ? (
              <Card>
                <CardHeader>
                  <CardTitle>Informações da família</CardTitle>
                  <CardDescription>Edite o nome da família.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateFamily} className="flex gap-2">
                    <Input
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      placeholder="Nome da família (opcional)"
                      maxLength={120}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={updateFamily.isPending}>
                      {updateFamily.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {/* Seção 2: Membros */}
            <Card>
              <CardHeader>
                <CardTitle>Membros</CardTitle>
                <CardDescription>Proprietário e membros com convite aceito.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {membersQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando membros...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Owner */}
                    {membersQuery.data?.family.owner ? (
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <p className="font-medium">
                            {getMemberDisplay(
                              membersQuery.data.family.owner.name,
                              membersQuery.data.family.owner.email
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {membersQuery.data.family.owner.email}
                            {' '}
                            <span className="rounded bg-muted px-1 py-0.5 font-medium">proprietário</span>
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* Membros aceitos */}
                    {acceptedMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Ainda não há outros membros.</p>
                    ) : (
                      acceptedMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            <p className="font-medium">
                              {getMemberDisplay(member.user?.name, member.email)}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          {isOwner && member.userId ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                                  <UserMinus className="h-4 w-4" />
                                  Remover
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover membro</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover <strong>{member.email}</strong> da família? O membro perderá acesso aos arquivos compartilhados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() =>
                                      removeMember.mutate({
                                        familyId: selectedFamilyId,
                                        userId: member.userId as string,
                                      })
                                    }
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Form de convite (apenas owner) */}
                {isOwner ? (
                  <div className="border-t pt-4">
                    <Label className="mb-2 block text-sm font-medium">Convidar por e-mail</Label>
                    <form onSubmit={handleInvite} className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="pl-9"
                          placeholder="membro@email.com"
                        />
                      </div>
                      <Button type="submit" disabled={inviteMember.isPending}>
                        {inviteMember.isPending ? 'Enviando...' : 'Convidar'}
                      </Button>
                    </form>

                    {/* Convites pendentes enviados */}
                    {pendingInvites.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Aguardando resposta
                        </p>
                        {pendingInvites.map((invite) => (
                          <div key={invite.id} className="flex items-center gap-2 rounded-md border border-dashed p-2 text-sm">
                            <span className="flex-1 min-w-0 truncate">{invite.email}</span>
                            <span className="text-xs text-muted-foreground shrink-0">pendente</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Seção 3: Meus convites recebidos */}
            <Card>
              <CardHeader>
                <CardTitle>Meus convites recebidos</CardTitle>
                <CardDescription>Convites pendentes enviados para sua conta.</CardDescription>
              </CardHeader>
              <CardContent>
                {invitationsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando convites...
                  </div>
                ) : receivedInvitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
                ) : (
                  <div className="space-y-2">
                    {receivedInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                      >
                        <div>
                          <p className="font-medium">{invitation.family.name || 'Família sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{invitation.email}</p>
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

            {/* Seção 4: Zona de perigo */}
            <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="text-destructive">Zona de perigo</CardTitle>
                  <CardDescription>Ações irreversíveis para esta família.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  {/* Sair da família (apenas membros, não owner) */}
                  {!isOwner && user ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10">
                          <UserMinus className="h-4 w-4" />
                          Sair da família
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sair da família</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja sair desta família? Você perderá acesso a todos os arquivos compartilhados e precisará de um novo convite para entrar novamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() =>
                              removeMember.mutate(
                                { familyId: selectedFamilyId, userId: user.id },
                                {
                                  onSuccess: async () => {
                                    await queryClient.invalidateQueries({ queryKey: ['families'] });
                                    router.push('/dashboard/family');
                                  },
                                }
                              )
                            }
                          >
                            Sair da família
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}

                  {/* Excluir família (apenas owner) */}
                  {isOwner ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="gap-2" disabled={deleteFamily.isPending}>
                          <Trash2 className="h-4 w-4" />
                          Excluir família
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir família</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é permanente e não pode ser desfeita. Para excluir, a família não pode ter membros aceitos — remova todos antes de continuar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteFamily.mutate(selectedFamilyId)}
                          >
                            Excluir permanentemente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}

function FamilySettingsPageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function FamilySettingsPage() {
  return (
    <Suspense fallback={<FamilySettingsPageFallback />}>
      <FamilySettingsPageContent />
    </Suspense>
  );
}
