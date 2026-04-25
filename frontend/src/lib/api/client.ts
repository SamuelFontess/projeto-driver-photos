const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const RETRYABLE_STATUS = new Set([408, 500, 502, 503, 504]);
const REFRESH_ENDPOINT = '/api/auth/refresh';

// Endpoints públicos que podem retornar 401 legitimamente (credencial inválida)
// e NÃO devem disparar o fluxo de session refresh
const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]);

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

function notifySessionExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:session-expired'));
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

    if (status === 401 && endpoint !== REFRESH_ENDPOINT && !PUBLIC_AUTH_ENDPOINTS.has(endpoint)) {
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
      notifySessionExpired();
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

async function extractBlobResponse(response: Response): Promise<{ blob: Blob; filename?: string }> {
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

// retorna blob e filename extraído do header Content-Disposition
export async function requestBlob(
  endpoint: string
): Promise<{ blob: Blob; filename?: string }> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retryResponse = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (retryResponse.ok) return extractBlobResponse(retryResponse);
      throw new ApiError(await parseError(retryResponse), retryResponse.status);
    }
    notifySessionExpired();
    throw new ApiError('Session expired', 401);
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  return extractBlobResponse(response);
}
