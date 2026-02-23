/** Pastas: tipos e CRUD. FolderFile é usado também na listagem de arquivos. */

import { request } from './client';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  childrenCount?: number;
  filesCount?: number;
}

export interface CreateFolderPayload {
  name: string;
  parentId?: string | null;
  familyId?: string;
}

export interface FolderFile {
  id: string;
  name: string;
  size: number;
  mimeType: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderWithDetails extends Folder {
  children: Folder[];
  files: FolderFile[];
}

export interface FolderScopeParams {
  familyId?: string;
}

export async function getFolders(
  parentId?: string | null,
  scope: FolderScopeParams = {}
): Promise<{ folders: Folder[] }> {
  const { familyId } = scope;
  const params = new URLSearchParams();
  if (parentId !== undefined && parentId !== null) {
    params.set('parentId', parentId);
  }
  if (familyId) {
    params.set('familyId', familyId);
  }
  const query = params.toString();
  return request<{ folders: Folder[] }>(
    `/api/folders${query ? `?${query}` : ''}`,
    { method: 'GET' }
  );
}

export async function createFolder(
  name: string,
  parentId?: string | null,
  scope: FolderScopeParams = {}
): Promise<{ folder: Folder }> {
  const { familyId } = scope;
  return request<{ folder: Folder }>('/api/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parentId: parentId ?? null, familyId }),
  });
}

export async function getFolder(
  id: string,
  scope: FolderScopeParams = {}
): Promise<{ folder: FolderWithDetails }> {
  const params = new URLSearchParams();
  if (scope.familyId) {
    params.set('familyId', scope.familyId);
  }
  const query = params.toString();

  return request<{ folder: FolderWithDetails }>(
    `/api/folders/${encodeURIComponent(id)}${query ? `?${query}` : ''}`,
    {
      method: 'GET',
    }
  );
}

export async function updateFolder(
  id: string,
  data: { name?: string; parentId?: string | null },
  scope: FolderScopeParams = {}
): Promise<{ folder: Folder }> {
  const params = new URLSearchParams();
  if (scope.familyId) {
    params.set('familyId', scope.familyId);
  }
  const query = params.toString();

  return request<{ folder: Folder }>(
    `/api/folders/${encodeURIComponent(id)}${query ? `?${query}` : ''}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteFolder(
  id: string,
  scope: FolderScopeParams = {}
): Promise<void> {
  const params = new URLSearchParams();
  if (scope.familyId) {
    params.set('familyId', scope.familyId);
  }
  const query = params.toString();

  await request<void>(`/api/folders/${encodeURIComponent(id)}${query ? `?${query}` : ''}`, {
    method: 'DELETE',
  });
}
