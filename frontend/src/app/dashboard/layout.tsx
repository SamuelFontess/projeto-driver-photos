'use client';

import { SidebarProvider } from '@/src/contexts/SidebarContext';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { Sidebar } from '@/src/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
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
    </SidebarProvider>
  );
}
