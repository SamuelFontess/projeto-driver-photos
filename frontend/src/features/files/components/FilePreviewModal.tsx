'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui';
import { type FolderFile } from '@/src/lib/api';
import { Download, File as FileIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
import { Loader2 } from 'lucide-react';

interface FilePreviewModalProps {
  file: FolderFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FolderFile) => void;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      // Check if it's an image
      const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      
      if (isImage) {
        setLoading(true);
        setError(false);
        // Fetch blob to show preview
        api.downloadFile(file.id)
          .then(({ blob }) => {
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
          })
          .catch(() => setError(true))
          .finally(() => setLoading(false));
      } else {
        setImageUrl(null);
      }
    } else {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
      setLoading(false);
      setError(false);
    }
    
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [isOpen, file]);

  if (!file) return null;

  const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 truncate">
            {file.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-md overflow-hidden relative">
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando visualização...</p>
            </div>
          )}
          
          {!loading && isImage && imageUrl && (
            <img 
              src={imageUrl} 
              alt={file.name} 
              className="max-w-full max-h-full object-contain" 
            />
          )}

          {!loading && (!isImage || error) && (
            <div className="flex flex-col items-center gap-4 text-center p-8">
              <div className="bg-muted p-6 rounded-full">
                <FileIcon className="h-16 w-16 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-lg">Visualização indisponível</p>
                <p className="text-muted-foreground">
                  Este tipo de arquivo não pode ser visualizado aqui.
                </p>
              </div>
              <Button onClick={() => onDownload(file)}>
                <Download className="mr-2 h-4 w-4" />
                Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
