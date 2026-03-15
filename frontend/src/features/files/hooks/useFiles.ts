import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { type FileBrowserScope } from "../types";

function resolveFamilyId(scope: FileBrowserScope): string | undefined {
  return scope.type === "family" ? scope.familyId : undefined;
}

export interface UseFilesOptions {
  page?: number;
  limit?: number;
}

export function useFiles(
  folderId: string | null,
  scope: FileBrowserScope,
  search?: string,
  { page = 1, limit = 50 }: UseFilesOptions = {},
) {
  const familyId = resolveFamilyId(scope);
  const normalizedSearch = search?.trim() || undefined;

  return useQuery({
    queryKey: [
      "files",
      scope.type,
      familyId ?? null,
      folderId,
      normalizedSearch,
      page,
      limit,
    ],
    queryFn: () =>
      api.getFiles({
        folderId,
        familyId,
        search: normalizedSearch,
        page,
        limit,
      }),
  });
}
