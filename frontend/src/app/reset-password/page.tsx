'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HardDrive, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@/src/components/ui';
import { PublicOnlyRoute } from '@/src/components/auth/PublicOnlyRoute';
import { useToast } from '@/src/hooks/use-toast';
import { api } from '@/src/lib/api';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/src/features/auth/schemas';

function ResetPasswordContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast({
        title: 'Link inválido',
        description: 'O token de redefinição não foi informado.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.resetPassword({ token, password: data.password });
      toast({
        title: 'Senha redefinida',
        description: 'Você já pode entrar com sua nova senha.',
      });
      router.push('/login');
    } catch (error: unknown) {
      toast({
        title: 'Erro ao redefinir senha',
        description: error instanceof Error ? error.message : 'Tente novamente.',
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
            <h1 className="text-2xl font-semibold text-foreground">Redefinir senha</h1>
            <p className="text-sm text-muted-foreground">
              Informe sua nova senha para concluir a recuperação.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">
                Nova senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register('password')}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-muted-foreground">
                Confirmar senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-12" disabled={isSubmitting || !token}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                'Redefinir senha'
              )}
            </Button>
          </form>

          {!token && (
            <p className="text-sm text-destructive">
              Link inválido: token de redefinição ausente.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/forgot-password" className="text-primary hover:underline font-medium">
              Solicitar novo link
            </Link>
          </p>
        </div>
      </div>
    </PublicOnlyRoute>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="text-sm text-muted-foreground">Carregando...</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
