'use client';

import { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  children?: React.ReactNode;
}

export function UploadZone({
  onFilesSelected,
  isUploading,
  children,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && !isUploading) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected, isUploading]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative min-h-[400px] transition-all',
        isDragging && 'bg-primary/5 border-primary border-2 border-dashed rounded-lg'
      )}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <Upload className="h-12 w-12 text-primary mb-4" />
          <p className="text-lg font-medium">Solte os arquivos aqui</p>
          <p className="text-sm text-muted-foreground mt-2">
            Os arquivos serão enviados para esta pasta
          </p>
        </div>
      )}
      {children}
    </div>
  );
}
