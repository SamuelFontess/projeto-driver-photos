'use client';

import { useState } from 'react';
import { useToast } from '@/src/hooks/use-toast';
import { Button } from '@/src/components/ui';
import { Plus, Upload, Grid3x3, List } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { useCreateFolder } from '../hooks/useFolderActions';
import { type FileBrowserScope, type ViewMode } from '../types';

interface FileActionsProps {
  currentFolderId: string | null;
  scope: FileBrowserScope;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onUploadClick: () => void;
}

export function FileActions({
  currentFolderId,
  scope,
  viewMode,
  onViewModeChange,
  onUploadClick,
}: FileActionsProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const [open, setOpen] = useState(false);
  const createFolder = useCreateFolder(scope);
  const { toast } = useToast();

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) {
      toast({ title: 'Erro', description: 'Digite um nome para a pasta.', variant: 'destructive' });
      return;
    }

    await createFolder.mutateAsync({
      name,
      parentId: currentFolderId,
    });
    setNewFolderName('');
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onUploadClick} size="sm" aria-label="Enviar arquivos">
        <Upload className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Enviar arquivos</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Nova pasta">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova pasta</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleCreateFolder}>
            <DialogHeader>
              <DialogTitle>Criar nova pasta</DialogTitle>
              <DialogDescription>
                Digite o nome da pasta que deseja criar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="folder-name">Nome da pasta</Label>
                <Input
                  id="folder-name"
                  placeholder="Ex: Trabalho"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  maxLength={120}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createFolder.isPending}>
                {createFolder.isPending ? 'Criando...' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-muted p-1" role="group" aria-label="Modo de visualização">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          aria-pressed={viewMode === 'grid'}
          aria-label="Visualização em grade"
          className="h-7 w-7 p-0 rounded-md"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          aria-pressed={viewMode === 'list'}
          aria-label="Visualização em lista"
          className="h-7 w-7 p-0 rounded-md"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
