'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api, type FamilySummary } from '@/src/lib/api';

interface UseFamilySelectionOptions {
  clearFolderOnFamilyChange?: boolean;
}

interface UseFamilySelectionResult {
  families: FamilySummary[];
  selectedFamilyId: string | null;
  selectedFamily: FamilySummary | null;
  isLoadingFamilies: boolean;
  setSelectedFamilyId: (familyId: string) => void;
  createFamily: (name?: string) => Promise<string>;
  isCreatingFamily: boolean;
}

export function useFamilySelection(
  options: UseFamilySelectionOptions = {}
): UseFamilySelectionResult {
  const { clearFolderOnFamilyChange = false } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedFamilyId, setSelectedFamilyIdState] = useState<string | null>(null);

  const familiesQuery = useQuery({
    queryKey: ['families'],
    queryFn: () => api.getFamilies(),
  });

  const families = useMemo(
    () => familiesQuery.data?.families ?? [],
    [familiesQuery.data?.families]
  );
  const familyIdFromUrl = searchParams.get('familyId');

  useEffect(() => {
    if (!families.length) {
      setSelectedFamilyIdState(null);
      if (familyIdFromUrl) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('familyId');
        router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
      }
      return;
    }

    const hasSelectedFamily =
      selectedFamilyId !== null && families.some((family) => family.id === selectedFamilyId);
    if (hasSelectedFamily) {
      return;
    }

    const hasFamilyInUrl =
      familyIdFromUrl !== null && families.some((family) => family.id === familyIdFromUrl);

    if (hasFamilyInUrl) {
      setSelectedFamilyIdState(familyIdFromUrl);
      return;
    }

    setSelectedFamilyIdState(families[0].id);
  }, [families, familyIdFromUrl, pathname, router, searchParams, selectedFamilyId]);

  useEffect(() => {
    if (!selectedFamilyId) return;

    const params = new URLSearchParams(searchParams.toString());
    const currentFamilyId = params.get('familyId');
    const shouldUpdateFamily = currentFamilyId !== selectedFamilyId;
    const shouldClearFolder = clearFolderOnFamilyChange && shouldUpdateFamily && params.has('folder');

    if (!shouldUpdateFamily && !shouldClearFolder) {
      return;
    }

    params.set('familyId', selectedFamilyId);
    if (shouldClearFolder) {
      params.delete('folder');
    }

    router.replace(`${pathname}?${params.toString()}`);
  }, [clearFolderOnFamilyChange, pathname, router, searchParams, selectedFamilyId]);

  const createFamilyMutation = useMutation<
    { family: FamilySummary },
    Error,
    string | undefined
  >({
    mutationFn: (name) => api.createFamily(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });

  const selectedFamily = useMemo(
    () => families.find((family) => family.id === selectedFamilyId) ?? null,
    [families, selectedFamilyId]
  );

  const setSelectedFamilyId = (familyId: string) => {
    setSelectedFamilyIdState(familyId);
  };

  const createFamily = async (name?: string): Promise<string> => {
    const response = await createFamilyMutation.mutateAsync(name?.trim() || undefined);
    setSelectedFamilyIdState(response.family.id);
    return response.family.id;
  };

  return {
    families,
    selectedFamilyId,
    selectedFamily,
    isLoadingFamilies: familiesQuery.isLoading,
    setSelectedFamilyId,
    createFamily,
    isCreatingFamily: createFamilyMutation.isPending,
  };
}
