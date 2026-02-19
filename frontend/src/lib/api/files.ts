/** Arquivos: listar, enviar (único ou múltiplos) e baixar. Usa FolderFile da pasta. */

import { request, requestBlob } from './client';
import type { FolderFile } from './folders';

export type { FolderFile };

export interface UpdateFilePayload {
  name?: string;
  folderId?: string | null;
}

export async function getFiles(
  folderId?: string | null
): Promise<{ files: FolderFile[] }> {
  const params = new URLSearchParams();
  if (folderId !== undefined && folderId !== null) {
    params.set('folderId', folderId);
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
  folderId?: string | null
): Promise<{ file: FolderFile }> {
  const form = new FormData();
  form.append('files', file);
  if (folderId !== undefined && folderId !== null) {
    form.append('folderId', folderId);
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
  folderId?: string | null
): Promise<{ files: FolderFile[] }> {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }
  if (folderId !== undefined && folderId !== null) {
    form.append('folderId', folderId);
  }
  return request<{ files: FolderFile[] }>('/api/files', {
    method: 'POST',
    body: form,
  });
}

export async function downloadFile(
  id: string
): Promise<{ blob: Blob; filename?: string }> {
  return requestBlob(`/api/files/${encodeURIComponent(id)}/download`);
}

export async function getFile(id: string): Promise<{ file: FolderFile }> {
  return request<{ file: FolderFile }>(`/api/files/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function updateFile(
  id: string,
  data: UpdateFilePayload
): Promise<{ file: FolderFile }> {
  return request<{ file: FolderFile }>(`/api/files/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteFile(id: string): Promise<void> {
  await request<void>(`/api/files/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
