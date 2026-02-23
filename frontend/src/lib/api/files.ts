/** Arquivos: listar, enviar (único ou múltiplos) e baixar. Usa FolderFile da pasta. */

import { request, requestBlob } from './client';
import type { FolderFile } from './folders';

export type { FolderFile };

export interface UpdateFilePayload {
  name?: string;
  folderId?: string | null;
}

export interface GetFilesParams {
  folderId?: string | null;
  familyId?: string;
  search?: string;
}

export async function getFiles(
  queryParams: GetFilesParams = {}
): Promise<{ files: FolderFile[] }> {
  const { folderId, familyId, search } = queryParams;
  const params = new URLSearchParams();
  if (folderId !== undefined && folderId !== null) {
    params.set('folderId', folderId);
  }
  if (familyId) {
    params.set('familyId', familyId);
  }
  if (search && search.trim().length > 0) {
    params.set('search', search.trim());
  }
  const query = params.toString();
  return request<{ files: FolderFile[] }>(
    `/api/files${query ? `?${query}` : ''}`,
    { method: 'GET' }
  );
}

// Envia um único arquivo. Usa o campo 'files' para manter compatibilidade com o backend (multer.array)
export async function uploadFile(
  file: File,
  folderId?: string | null,
  familyId?: string
): Promise<{ file: FolderFile }> {
  const form = new FormData();
  form.append('files', file);
  if (folderId !== undefined && folderId !== null) {
    form.append('folderId', folderId);
  }
  if (familyId) {
    form.append('familyId', familyId);
  }
  const result = await request<{ files: FolderFile[] }>('/api/files', {
    method: 'POST',
    body: form,
  });
  return { file: result.files[0] };
}

// Envia múltiplos arquivos em uma única request (máx. 20 por vez, limite do backend)
export async function uploadFiles(
  files: File[],
  folderId?: string | null,
  familyId?: string
): Promise<{ files: FolderFile[] }> {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }
  if (folderId !== undefined && folderId !== null) {
    form.append('folderId', folderId);
  }
  if (familyId) {
    form.append('familyId', familyId);
  }
  return request<{ files: FolderFile[] }>('/api/files', {
    method: 'POST',
    body: form,
  });
}

export async function downloadFile(
  id: string,
  familyId?: string
): Promise<{ blob: Blob; filename?: string }> {
  const params = new URLSearchParams();
  if (familyId) {
    params.set('familyId', familyId);
  }
  const query = params.toString();
  return requestBlob(`/api/files/${encodeURIComponent(id)}/download${query ? `?${query}` : ''}`);
}

export async function getFilePreviewBlob(id: string, familyId?: string): Promise<Blob> {
  const params = new URLSearchParams();
  if (familyId) {
    params.set('familyId', familyId);
  }
  const query = params.toString();
  const { blob } = await requestBlob(
    `/api/files/${encodeURIComponent(id)}/preview${query ? `?${query}` : ''}`
  );
  return blob;
}

export async function getFile(id: string, familyId?: string): Promise<{ file: FolderFile }> {
  const params = new URLSearchParams();
  if (familyId) {
    params.set('familyId', familyId);
  }
  const query = params.toString();
  return request<{ file: FolderFile }>(
    `/api/files/${encodeURIComponent(id)}${query ? `?${query}` : ''}`,
    {
      method: 'GET',
    }
  );
}

export async function updateFile(
  id: string,
  data: UpdateFilePayload,
  familyId?: string
): Promise<{ file: FolderFile }> {
  const params = new URLSearchParams();
  if (familyId) {
    params.set('familyId', familyId);
  }
  const query = params.toString();
  return request<{ file: FolderFile }>(
    `/api/files/${encodeURIComponent(id)}${query ? `?${query}` : ''}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteFile(id: string, familyId?: string): Promise<void> {
  const params = new URLSearchParams();
  if (familyId) {
    params.set('familyId', familyId);
  }
  const query = params.toString();
  await request<void>(`/api/files/${encodeURIComponent(id)}${query ? `?${query}` : ''}`, {
    method: 'DELETE',
  });
}
