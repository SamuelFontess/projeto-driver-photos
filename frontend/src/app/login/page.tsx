'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/src/contexts/AuthContext';
import { loginSchema, type LoginFormData } from '@/src/features/auth/schemas';
import { PublicOnlyRoute } from '@/src/components/auth/PublicOnlyRoute';
import { Button, Input, Label } from '@/src/components/ui';
import Link from 'next/link';
import { useToast } from '@/src/hooks/use-toast';
import { Loader2, HardDrive } from 'lucide-react';
import { isFirebaseAuthEnabled } from '@/src/lib/firebase';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  const showGoogleLogin = isFirebaseAuthEnabled();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Redirecionando...',
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      toast({
        title: 'Erro ao fazer login',
        description: err instanceof Error ? err.message : 'Credenciais inválidas',
        variant: 'destructive',
      });
    }
  };

  return (
    <PublicOnlyRoute>
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-[440px] space-y-8 p-12">
          <div className="flex items-center gap-3">
            <HardDrive className="h-7 w-7 text-primary" />
            <span className="font-semibold text-lg text-foreground">Driver</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Entrar</h1>
            <p className="text-sm text-muted-foreground">
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            {showGoogleLogin && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  disabled={googleLoading}
                  onClick={async () => {
                    setGoogleLoading(true);
                    try {
                      await loginWithGoogle();
                      toast({
                        title: 'Login realizado com sucesso!',
                        description: 'Redirecionando...',
                      });
                      router.push('/dashboard');
                    } catch (err: unknown) {
                      toast({
                        title: 'Erro ao entrar com Google',
                        description: err instanceof Error ? err.message : 'Tente novamente',
                        variant: 'destructive',
                      });
                    } finally {
                      setGoogleLoading(false);
                    }
                  }}
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar com Google'
                  )}
                </Button>
              </>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </PublicOnlyRoute>
  );
}
