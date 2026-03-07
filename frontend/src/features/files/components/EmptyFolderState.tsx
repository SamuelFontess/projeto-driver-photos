'use client';

import { FolderOpen, Upload } from 'lucide-react';
import { Button } from '@/src/components/ui';

interface EmptyFolderStateProps {
  onUploadClick?: () => void;
}

export function EmptyFolderState({ onUploadClick }: EmptyFolderStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <FolderOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-base font-medium text-foreground">Esta pasta está vazia</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">
        Arraste arquivos para cá ou use o botão para começar.
      </p>
      {onUploadClick && (
        <Button type="button" onClick={onUploadClick} className="mt-5">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Enviar arquivo
        </Button>
      )}
    </div>
  );
}
