import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { type FileBrowserScope } from "../types";

function resolveFamilyId(scope: FileBrowserScope): string | undefined {
  return scope.type === "family" ? scope.familyId : undefined;
}

export interface UseFoldersOptions {
  page?: number;
  limit?: number;
}

export function useFolders(
  folderId: string | null,
  scope: FileBrowserScope,
  { page = 1, limit = 50 }: UseFoldersOptions = {},
) {
  const familyId = resolveFamilyId(scope);

  return useQuery({
    queryKey: ["folders", scope.type, familyId ?? null, folderId, page, limit],
    queryFn: () => api.getFolders(folderId, { familyId, page, limit }),
  });
}
