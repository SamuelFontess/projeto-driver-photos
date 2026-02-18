'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/src/contexts/AuthContext';
import { registerSchema, type RegisterFormData } from '@/src/features/auth/schemas';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import Link from 'next/link';
import { useToast } from '@/src/hooks/use-toast';
import { Loader2, HardDrive } from 'lucide-react';

export default function RegisterPage() {
  const { register: registerUser, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Redirecionar se já estiver autenticado
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.email, data.password, data.name);
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Redirecionando...',
      });
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: unknown) {
      toast({
        title: 'Erro ao criar conta',
        description: err instanceof Error ? err.message : 'Não foi possível criar a conta',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-[440px] space-y-7 p-12">
        <div className="flex items-center gap-3">
          <HardDrive className="h-7 w-7 text-primary" />
          <span className="font-semibold text-lg text-foreground">Driver</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Criar conta</h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados para começar
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground">Nome</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              {...register('name')}
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
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
                Criando conta...
              </>
            ) : (
              'Criar conta'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
