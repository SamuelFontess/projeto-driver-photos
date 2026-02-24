'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HardDrive, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@/src/components/ui';
import { PublicOnlyRoute } from '@/src/components/auth/PublicOnlyRoute';
import { useToast } from '@/src/hooks/use-toast';
import { api } from '@/src/lib/api';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@/src/features/auth/schemas';

export default function ForgotPasswordPage() {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await api.forgotPassword({ email: data.email });
      toast({
        title: 'Solicitação enviada',
        description: 'Se o email existir, enviaremos instruções para redefinir sua senha.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erro ao solicitar redefinição',
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
            <h1 className="text-2xl font-semibold text-foreground">Esqueci minha senha</h1>
            <p className="text-sm text-muted-foreground">
              Informe seu email para receber o link de redefinição.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar instruções'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Lembrou sua senha?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Voltar para login
            </Link>
          </p>
        </div>
      </div>
    </PublicOnlyRoute>
  );
}
