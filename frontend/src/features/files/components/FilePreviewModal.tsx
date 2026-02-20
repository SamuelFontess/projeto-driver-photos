'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui';
import { type FolderFile } from '@/src/lib/api';
import { Download, File as FileIcon, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/src/lib/api';
import { useQuery } from '@tanstack/react-query';

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
  const [textContent, setTextContent] = useState<string | null>(null);

  const fileKind = useMemo(() => {
    if (!file) return 'unsupported' as const;

    const mime = (file.mimeType || '').toLowerCase();
    const name = file.name.toLowerCase();

    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)) {
      return 'image' as const;
    }
    if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
      return 'pdf' as const;
    }
    if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(name)) {
      return 'audio' as const;
    }
    if (mime.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv)$/i.test(name)) {
      return 'video' as const;
    }
    if (
      mime.startsWith('text/') ||
      ['application/json', 'application/xml', 'application/javascript'].includes(mime) ||
      /\.(txt|md|json|csv|log|xml|js|ts|tsx|jsx|html|css|yml|yaml)$/i.test(name)
    ) {
      return 'text' as const;
    }

    return 'unsupported' as const;
  }, [file]);

  const previewQuery = useQuery({
    queryKey: ['file-preview-blob', file?.id],
    queryFn: async () => {
      if (!file) throw new Error('File is required');
      return api.getFilePreviewBlob(file.id);
    },
    enabled: isOpen && !!file && fileKind !== 'unsupported',
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const objectUrl = useMemo(() => {
    if (!previewQuery.data) return null;
    return URL.createObjectURL(previewQuery.data);
  }, [previewQuery.data]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    if (!previewQuery.data || fileKind !== 'text') {
      setTextContent(null);
      return;
    }

    let isCancelled = false;
    previewQuery.data
      .text()
      .then((content) => {
        if (!isCancelled) {
          setTextContent(content);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setTextContent(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [previewQuery.data, fileKind]);

  if (!file) return null;

  const loading = previewQuery.isLoading;
  const error = previewQuery.isError;

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
          
          {!loading && !error && objectUrl && fileKind === 'image' && (
            <img src={objectUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
          )}

          {!loading && !error && objectUrl && fileKind === 'pdf' && (
            <iframe src={objectUrl} title={file.name} className="w-full h-full border-0" />
          )}

          {!loading && !error && objectUrl && fileKind === 'audio' && (
            <audio src={objectUrl} controls className="w-full max-w-xl" />
          )}

          {!loading && !error && objectUrl && fileKind === 'video' && (
            <video src={objectUrl} controls className="max-w-full max-h-full" />
          )}

          {!loading && !error && fileKind === 'text' && (
            <div className="w-full h-full overflow-auto p-4">
              <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                {textContent ?? 'Carregando conteúdo...'}
              </pre>
            </div>
          )}

          {!loading && (fileKind === 'unsupported' || error) && (
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
