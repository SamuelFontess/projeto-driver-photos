'use client';

import { Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui';
import { FamilyHeader } from '@/src/features/family/components/FamilyHeader';
import { FamilyCreateCard } from '@/src/features/family/components/FamilyCreateCard';
import { useFamilySelection } from '@/src/features/family/hooks/useFamilySelection';

function getMemberDisplay(name: string | null, email: string): string {
  return name?.trim() || email;
}

function FamilyMembersPageContent() {
  const { toast } = useToast();
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

  const acceptedMembers = useMemo(
    () => membersQuery.data?.members.filter((member) => member.status === 'accepted') ?? [],
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

  return (
    <div className="flex h-full flex-col">
      <FamilyHeader
        title="Configurações da família"
        subtitle="Visualize os membros aceitos da família."
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
              <CardTitle>Membros da família</CardTitle>
              <CardDescription>Proprietário e membros com convite aceito.</CardDescription>
            </CardHeader>
            <CardContent>
              {membersQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando membros...
                </div>
              ) : (
                <div className="space-y-2">
                  {membersQuery.data?.family.owner ? (
                    <div className="rounded-md border p-3">
                      <p className="font-medium">
                        {getMemberDisplay(
                          membersQuery.data.family.owner.name,
                          membersQuery.data.family.owner.email
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {membersQuery.data.family.owner.email} (proprietário)
                      </p>
                    </div>
                  ) : null}
                  {acceptedMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ainda não há membros aceitos.</p>
                  ) : (
                    acceptedMembers.map((member) => (
                      <div key={member.id} className="rounded-md border p-3">
                        <p className="font-medium">
                          {getMemberDisplay(member.user?.name ?? null, member.email)}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FamilyMembersPageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function FamilyMembersPage() {
  return (
    <Suspense fallback={<FamilyMembersPageFallback />}>
      <FamilyMembersPageContent />
    </Suspense>
  );
}
