'use client';

import { useState } from 'react';
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

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    await createFolder.mutateAsync({
      name,
      parentId: currentFolderId,
    });
    setNewFolderName('');
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onUploadClick} size="sm">
        <Upload className="mr-2 h-4 w-4" />
        Enviar arquivos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nova pasta
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

      <div className="ml-auto flex items-center gap-1 border rounded-md">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className="rounded-r-none"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className="rounded-l-none"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
