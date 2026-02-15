/** Pastas: tipos e CRUD. FolderFile é usado também na listagem de arquivos. */

import { request } from './client';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderPayload {
  name: string;
  parentId?: string | null;
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

export async function getFolders(parentId?: string | null): Promise<{ folders: Folder[] }> {
  const params = new URLSearchParams();
  if (parentId !== undefined && parentId !== null) {
    params.set('parentId', parentId);
  }
  const query = params.toString();
  return request<{ folders: Folder[] }>(
    `/api/folders${query ? `?${query}` : ''}`,
    { method: 'GET' }
  );
}

export async function createFolder(
  name: string,
  parentId?: string | null
): Promise<{ folder: Folder }> {
  return request<{ folder: Folder }>('/api/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parentId: parentId ?? null }),
  });
}

export async function getFolder(id: string): Promise<{ folder: FolderWithDetails }> {
  return request<{ folder: FolderWithDetails }>(`/api/folders/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function deleteFolder(id: string): Promise<void> {
  await request<void>(`/api/folders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
