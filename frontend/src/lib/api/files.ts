/** Arquivos: listar, enviar e baixar. Usa FolderFile da pasta. */

import { request, requestBlob } from './client';
import type { FolderFile } from './folders';

export type { FolderFile };

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

export async function uploadFile(
  file: File,
  folderId?: string | null
): Promise<{ file: FolderFile }> {
  const form = new FormData();
  form.append('file', file);
  if (folderId !== undefined && folderId !== null) {
    form.append('folderId', folderId);
  }
  return request<{ file: FolderFile }>('/api/files', {
    method: 'POST',
    body: form,
  });
}

export async function downloadFile(
  id: string
): Promise<{ blob: Blob; filename?: string }> {
  return requestBlob(`/api/files/${encodeURIComponent(id)}/download`);
}
