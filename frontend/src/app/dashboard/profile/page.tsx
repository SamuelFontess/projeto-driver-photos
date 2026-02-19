'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { api, type UpdateProfilePayload } from '@/src/lib/api';
import { useToast } from '@/src/hooks/use-toast';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/src/components/ui';
import { Loader2, User, Lock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (showPasswordFields) {
      if (!currentPassword) {
        toast({ title: 'Erro', description: 'Digite a senha atual para alterar a senha.', variant: 'destructive' });
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        toast({ title: 'Erro', description: 'A nova senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);

    try {
      const payload: UpdateProfilePayload = {};

      if (name.trim() !== (user?.name || '')) {
        payload.name = name.trim();
      }

      if (email.trim().toLowerCase() !== (user?.email || '').toLowerCase()) {
        payload.email = email.trim().toLowerCase();
      }

      if (showPasswordFields && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        toast({ title: 'Nenhuma alteração', description: 'Nenhuma alteração foi feita.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const response = await api.updateProfile(payload);
      updateUser(response.user);

      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas com sucesso.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordFields = () => {
    setShowPasswordFields((prev) => !prev);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Perfil</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Dados pessoais */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Informações pessoais</CardTitle>
                  <CardDescription>Atualize seu nome e email.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Nome</Label>
                    <Input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      disabled={saving}
                    />
                    <p className="text-sm text-muted-foreground">
                      Ao alterar o email, você pode precisar fazer login novamente.
                    </p>
                  </div>
                </div>

                {/* Seção de senha */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Lock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Senha</p>
                        <p className="text-sm text-muted-foreground">Altere sua senha de acesso.</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={togglePasswordFields}
                      disabled={saving}
                    >
                      {showPasswordFields ? 'Cancelar' : 'Alterar senha'}
                    </Button>
                  </div>

                  {showPasswordFields && (
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div className="space-y-2">
                        <Label htmlFor="profile-current-password">Senha atual</Label>
                        <Input
                          id="profile-current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Digite sua senha atual"
                          disabled={saving}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-new-password">Nova senha</Label>
                        <Input
                          id="profile-new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          disabled={saving}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-confirm-password">Confirmar nova senha</Label>
                        <Input
                          id="profile-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Digite a nova senha novamente"
                          disabled={saving}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar alterações'
                    )}
                  </Button>
                  <Link href="/dashboard">
                    <Button type="button" variant="outline" disabled={saving}>
                      Cancelar
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
