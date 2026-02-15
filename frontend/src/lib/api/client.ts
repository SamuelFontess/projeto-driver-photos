/** Cliente HTTP: base URL, token e tratamento de erros. Para FormData não setamos Content-Type. */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getBaseUrl(): string {
  return API_URL;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error((error as { error?: string }).error || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Retorna blob e nome do arquivo (Content-Disposition) para download. */
export async function requestBlob(
  endpoint: string
): Promise<{ blob: Blob; filename?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, { method: 'GET', headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error((error as { error?: string }).error || `HTTP error! status: ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  let filename: string | undefined;
  if (disposition) {
    const match = /filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i.exec(disposition)
      ?? /filename="?([^";\n]+)"?/i.exec(disposition);
    if (match?.[1]) {
      filename = decodeURIComponent(match[1].trim());
    }
  }
  return { blob, filename };
}
