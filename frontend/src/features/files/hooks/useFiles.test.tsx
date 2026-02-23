import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useFiles } from './useFiles';
import { api } from '@/src/lib/api';

vi.mock('@/src/lib/api', () => ({
  api: {
    getFiles: vi.fn(),
  },
}));

describe('useFiles', () => {
  it('requests files using folder and search params', async () => {
    const getFilesMock = vi.mocked(api.getFiles);
    getFilesMock.mockResolvedValue({ files: [] });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useFiles('folder-1', { type: 'user' }, 'report'),
      {
      wrapper,
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getFilesMock).toHaveBeenCalledWith({
      folderId: 'folder-1',
      search: 'report',
    });
  });
});
