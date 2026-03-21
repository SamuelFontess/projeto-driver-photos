/** Cliente HTTP: base URL e tratamento de erros. Autenticação via cookie HTTP-only. */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const REFRESH_ENDPOINT = '/api/auth/refresh';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getBaseUrl(): string {
  return API_URL;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}${REFRESH_ENDPOINT}`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

async function parseError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => ({ error: 'An error occurred' }));
  return (payload as { error?: string }).error || `HTTP error! status: ${response.status}`;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let attempt = 0;
  let response: Response | null = null;
  while (attempt < 2) {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    if (response.ok || !RETRYABLE_STATUS.has(response.status)) {
      break;
    }
    attempt += 1;
    await sleep(180 * attempt);
  }

  if (!response || !response.ok) {
    const status = response?.status ?? 500;

    if (status === 401 && endpoint !== REFRESH_ENDPOINT) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
        if (retryResponse.ok) {
          if (retryResponse.status === 204) return undefined as T;
          return retryResponse.json() as Promise<T>;
        }
        throw new ApiError(await parseError(retryResponse), retryResponse.status);
      }
      redirectToLogin();
      throw new ApiError('Session expired', 401);
    }

    const message = response ? await parseError(response) : 'Unexpected API error';
    throw new ApiError(message, status);
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
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new ApiError(message, response.status);
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
