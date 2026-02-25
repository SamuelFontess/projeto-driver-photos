'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/src/hooks/use-toast';
import { FileBrowser } from '@/src/features/files/components/FileBrowser';
import { FamilyCreateCard } from '@/src/features/family/components/FamilyCreateCard';
import { FamilyHeader } from '@/src/features/family/components/FamilyHeader';
import { useFamilySelection } from '@/src/features/family/hooks/useFamilySelection';

function FamilyPageContent() {
  const { toast } = useToast();
  const {
    families,
    selectedFamilyId,
    selectedFamily,
    isLoadingFamilies,
    setSelectedFamilyId,
    createFamily,
    isCreatingFamily,
  } = useFamilySelection({ clearFolderOnFamilyChange: true });

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
        title="Família"
        subtitle={
          selectedFamily
            ? `Arquivos compartilhados de ${selectedFamily.name ?? 'sua família ativa'}.`
            : 'Arquivos compartilhados da família ativa.'
        }
        families={families}
        selectedFamilyId={selectedFamilyId}
        onFamilyChange={setSelectedFamilyId}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {isLoadingFamilies ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando famílias...
          </div>
        ) : selectedFamilyId ? (
          <FileBrowser scope={{ type: 'family', familyId: selectedFamilyId }} basePath="/dashboard/family" />
        ) : (
          <FamilyCreateCard onCreateFamily={handleCreateFamily} isCreating={isCreatingFamily} />
        )}
      </div>
    </div>
  );
}

function FamilyPageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function FamilyPage() {
  return (
    <Suspense fallback={<FamilyPageFallback />}>
      <FamilyPageContent />
    </Suspense>
  );
}
