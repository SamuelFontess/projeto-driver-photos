'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui';

export default function FamilyInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get('invitationId');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invitationsQuery = useQuery({
    queryKey: ['family-invitations'],
    queryFn: () => api.getFamilyInvitations(),
    enabled: !!invitationId,
  });

  const invitation = useMemo(() => {
    const list = invitationsQuery.data?.invitations ?? [];
    return list.find((inv) => inv.id === invitationId) ?? null;
  }, [invitationsQuery.data?.invitations, invitationId]);

  const replyMutation = useMutation({
    mutationFn: ({ invitationId: id, action }: { invitationId: string; action: 'accept' | 'decline' }) =>
      api.replyFamilyInvitation(id, action),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['family-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['families'] }),
        queryClient.invalidateQueries({ queryKey: ['family-members'] }),
      ]);
      toast({
        title: variables.action === 'accept' ? 'Convite aceito' : 'Convite recusado',
        description:
          variables.action === 'accept'
            ? 'Você agora faz parte da família e pode acessar os arquivos compartilhados.'
            : 'O convite foi recusado.',
      });
      router.replace('/dashboard/family');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao responder convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAccept = useCallback(() => {
    if (invitationId) replyMutation.mutate({ invitationId, action: 'accept' });
  }, [invitationId, replyMutation]);

  const handleDecline = useCallback(() => {
    if (invitationId) replyMutation.mutate({ invitationId, action: 'decline' });
  }, [invitationId, replyMutation]);

  useEffect(() => {
    if (invitationId === null || invitationId === undefined) {
      router.replace('/dashboard/family');
    }
  }, [invitationId, router]);

  if (!invitationId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invitationsQuery.isLoading || invitationsQuery.isFetching) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Carregando convite...</p>
      </div>
    );
  }

  if (invitationsQuery.isError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
        <p className="text-center text-sm text-muted-foreground">
          Não foi possível carregar o convite. Faça login e tente novamente.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/family">Ir para Família</Link>
        </Button>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Convite não encontrado</CardTitle>
            <CardDescription>
              Este convite não existe, já foi respondido ou expirou. Você pode acessar a página da família para ver
              seus convites pendentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/family">Ir para Família</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Convite já respondido</CardTitle>
            <CardDescription>
              Este convite já foi {invitation.status === 'accepted' ? 'aceito' : 'recusado'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/family">Ir para Família</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const familyName = invitation.family?.name ?? 'Família';

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Convite para {familyName}</CardTitle>
          </div>
          <CardDescription>
            Você foi convidado(a) para fazer parte desta família no Driver. Ao aceitar, você terá acesso ao espaço
            compartilhado de arquivos e pastas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleAccept}
              disabled={replyMutation.isPending}
            >
              {replyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Aceitar convite'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={replyMutation.isPending}
            >
              Recusar
            </Button>
          </div>
          <Button asChild variant="ghost" size="sm" className="self-start">
            <Link href="/dashboard/family">Voltar para Família</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
