const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  token: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  createdAt: string;
}

export interface FolderWithDetails extends Folder {
  children: Folder[];
  files: FolderFile[];
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me', {
      method: 'GET',
    });
  }

  async getFolders(parentId?: string | null): Promise<{ folders: Folder[] }> {
    const params = new URLSearchParams();
    if (parentId !== undefined && parentId !== null) {
      params.set('parentId', parentId);
    }
    const query = params.toString();
    return this.request<{ folders: Folder[] }>(
      `/api/folders${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  }

  async createFolder(name: string, parentId?: string | null): Promise<{ folder: Folder }> {
    return this.request<{ folder: Folder }>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentId: parentId ?? null }),
    });
  }

  async getFolder(id: string): Promise<{ folder: FolderWithDetails }> {
    return this.request<{ folder: FolderWithDetails }>(`/api/folders/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  async deleteFolder(id: string): Promise<void> {
    await this.request<void>(`/api/folders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
