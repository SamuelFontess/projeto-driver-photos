'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { Toaster } from '@/src/components/ui/toaster';
import { ThemeProvider } from '@/src/components/theme-provider';
import { UploadProvider } from '@/src/contexts/UploadContext';
import { UploadProgress } from '@/src/components/upload-progress';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <UploadProvider>
            {children}
            <UploadProgress />
          </UploadProvider>
        </AuthProvider>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
