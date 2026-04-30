'use client';

import { Suspense } from 'react';
import { SidebarProvider } from '@/src/contexts/SidebarContext';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { Sidebar } from '@/src/components/layout/sidebar';
import { Loader2 } from 'lucide-react';
import { useEmailStatusSse, type EmailStatusEvent, type SseMessageEvent } from '@/src/hooks/use-email-status-sse';
import { useToast } from '@/src/hooks/use-toast';

const EMAIL_STATUS_LABELS: Record<EmailStatusEvent['type'], string> = {
  family_invite: 'Convite de família',
  family_invite_register: 'Convite de família',
  forgot_password: 'Redefinição de senha',
  manual_email: 'E-mail enviado',
  broadcast_email: 'E-mail enviado',
};

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

function EmailStatusListener() {
  const { toast } = useToast();

  const handleEmailStatus = (event: EmailStatusEvent) => {
    const title = EMAIL_STATUS_LABELS[event.type] ?? 'E-mail';
    if (event.status === 'sent') {
      toast({
        title,
        description: event.email ? `E-mail enviado para ${event.email}.` : 'E-mail enviado com sucesso.',
      });
    } else {
      toast({
        title,
        description: event.error ?? 'Falha ao enviar o e-mail.',
        variant: 'destructive',
      });
    }
  };

  const handleMessage = (event: SseMessageEvent) => {
    toast({
      title: event.type ?? 'Aviso do sistema',
      description: event.content,
    });
  };

  useEmailStatusSse(handleEmailStatus, handleMessage);

  return null;
}

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={<DashboardLayoutFallback />}>
        <ProtectedRoute>
          <EmailStatusListener />
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
