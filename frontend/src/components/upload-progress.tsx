'use client';

import { useUpload } from '@/src/contexts/UploadContext';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function UploadProgress() {
  const { uploads, clearCompleted } = useUpload();
  const [isMinimized, setIsMinimized] = useState(false);

  if (uploads.length === 0) return null;

  const pendingCount = uploads.filter((u) => u.status === 'pending' || u.status === 'uploading').length;
  const errorCount = uploads.filter((u) => u.status === 'error').length;
  const successCount = uploads.filter((u) => u.status === 'success').length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 shadow-lg">
      <Card>
        <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Uploads ({pendingCount} restantes)
          </CardTitle>
          <div className="flex items-center gap-2">
             <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <span className="sr-only">Minimizar</span>
              {isMinimized ? '+' : '-'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={clearCompleted}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="p-0 max-h-60 overflow-y-auto">
             <ul className="divide-y">
              {uploads.map((upload) => (
                <li key={upload.id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="flex-shrink-0">
                    {upload.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {upload.status === 'pending' && (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    {upload.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {upload.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{upload.file.name}</p>
                    {upload.status === 'error' && (
                      <p className="text-xs text-red-500 truncate">{upload.error}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
        
        {isMinimized && (
           <div className="px-4 pb-4 text-xs text-muted-foreground">
              {pendingCount > 0 ? (
                 <span>Enviando {pendingCount} arquivos...</span>
              ) : (
                 <span>{successCount} concluídos, {errorCount} erros.</span>
              )}
           </div>
        )}
      </Card>
    </div>
  );
}
