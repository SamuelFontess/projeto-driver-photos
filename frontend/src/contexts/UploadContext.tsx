'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api, type FolderFile } from '@/src/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/src/hooks/use-toast';

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

interface UploadContextType {
  uploads: UploadItem[];
  uploadFiles: (files: File[], folderId: string | null) => Promise<void>;
  clearCompleted: () => void;
  isUploading: boolean;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isUploading = uploads.some((u) => u.status === 'uploading' || u.status === 'pending');

  const uploadFiles = useCallback(async (files: File[], folderId: string | null) => {
    const newUploads: UploadItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'pending',
      progress: 0,
    }));

    setUploads((prev) => [...newUploads, ...prev]);

    // Process uploads one by one or in batches
    // Ideally, we would have a true progress event from the API, 
    // but fetch doesn't support it easily without XHR or Streams.
    // For now, we'll simulate progress or just mark as uploading -> success/error.

    for (const item of newUploads) {
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: 'uploading' } : u))
      );

      try {
        await api.uploadFile(item.file, folderId);
        setUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: 'success', progress: 100 } : u))
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        setUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: 'error', error: message } : u))
        );
        toast({
          title: 'Erro no upload',
          description: `Falha ao enviar ${item.file.name}: ${message}`,
          variant: 'destructive',
        });
      }
    }

    // Invalidate queries to refresh file list
    queryClient.invalidateQueries({ queryKey: ['files', folderId] });
    queryClient.invalidateQueries({ queryKey: ['folders', folderId] }); // in case folder counts update
  }, [queryClient, toast]);

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status === 'uploading' || u.status === 'pending'));
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, uploadFiles, clearCompleted, isUploading }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
