'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSidebar } from '@/src/contexts/SidebarContext';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/src/components/ui';
import { Loader2, ShieldCheck, Menu } from 'lucide-react';

export default function AdminPage() {
  const { user, authReady } = useAuth();
  const { toggleMobile } = useSidebar();
  const { toast } = useToast();
  const router = useRouter();

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (authReady && !user?.isAdmin) {
      router.replace('/dashboard');
    }
  }, [authReady, user, router]);

  if (!authReady || !user?.isAdmin) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha destinatário, assunto e mensagem.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      await api.sendAdminEmail({ to: to.trim(), subject: subject.trim(), body: body.trim() });
      toast({
        title: 'Email enviado',
        description: `Email enviado para ${to.trim()} com sucesso.`,
      });
      setTo('');
      setSubject('');
      setBody('');
    } catch (err: unknown) {
      toast({
        title: 'Erro ao enviar email',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={toggleMobile}
            className="md:hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base sm:text-lg font-semibold">Administração</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Enviar email manual</CardTitle>
                  <CardDescription>
                    Envie um email diretamente para qualquer destinatário.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-to">Para</Label>
                  <Input
                    id="admin-to"
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="destinatario@email.com"
                    disabled={sending}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-subject">Assunto</Label>
                  <Input
                    id="admin-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Assunto do email"
                    disabled={sending}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-body">Mensagem</Label>
                  <textarea
                    id="admin-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Conteúdo do email (HTML ou texto)"
                    disabled={sending}
                    required
                    rows={10}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    Aceita HTML ou texto simples.
                  </p>
                </div>

                <Button type="submit" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar email'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
