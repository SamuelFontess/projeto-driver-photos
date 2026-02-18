'use client';

import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
import { type Folder, type FolderFile } from '@/src/lib/api';

interface FileGridProps {
  folders: Folder[];
  files: FolderFile[];
  onFolderEnter: (folder: Folder) => void;
  onFolderRename: (folder: Folder) => void;
  onFolderMove: (folder: Folder) => void;
  onFolderDelete: (folder: Folder) => void;
  onFileDownload: (file: FolderFile) => void;
  onFilePreview: (file: FolderFile) => void;
  downloadingFileId?: string | null;
}

export function FileGrid({
  folders,
  files,
  onFolderEnter,
  onFolderRename,
  onFolderMove,
  onFolderDelete,
  onFileDownload,
  onFilePreview,
  downloadingFileId,
}: FileGridProps) {
  return (
    <div className="space-y-6">
      {folders.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Pastas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onEnter={onFolderEnter}
                onRename={onFolderRename}
                onMove={onFolderMove}
                onDelete={onFolderDelete}
              />
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Arquivos</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onDownload={onFileDownload}
                onPreview={onFilePreview}
                isDownloading={downloadingFileId === file.id}
              />
            ))}
          </div>
        </div>
      )}

      {folders.length === 0 && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            Esta pasta está vazia. Crie uma pasta ou envie arquivos para começar.
          </p>
        </div>
      )}
    </div>
  );
}
