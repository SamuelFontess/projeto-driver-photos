'use client';

import { Suspense } from 'react';
import { SidebarProvider } from '@/src/contexts/SidebarContext';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { Sidebar } from '@/src/components/layout/sidebar';
import { Loader2 } from 'lucide-react';

function DashboardLayoutFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Suspense fallback={<DashboardLayoutFallback />}>
        <ProtectedRoute>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </main>
          </div>
        </ProtectedRoute>
      </Suspense>
    </SidebarProvider>
  );
}
