'use client';

import { FormEvent, useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/src/components/ui';

interface FamilyCreateCardProps {
  onCreateFamily: (name?: string) => Promise<void> | void;
  isCreating: boolean;
}

export function FamilyCreateCard({ onCreateFamily, isCreating }: FamilyCreateCardProps) {
  const [familyName, setFamilyName] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateFamily(familyName.trim() || undefined);
    setFamilyName('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar família</CardTitle>
        <CardDescription>
          Você ainda não tem uma família ativa. Crie uma família para começar a compartilhar arquivos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="family-name">Nome da família (opcional)</Label>
            <Input
              id="family-name"
              placeholder="Ex: Família Silva"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              maxLength={80}
            />
          </div>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? 'Criando...' : 'Criar família'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
