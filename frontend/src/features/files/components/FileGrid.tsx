'use client';

import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
import { EmptyFolderState } from './EmptyFolderState';
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
  onFileDelete: (file: FolderFile) => void;
  downloadingFileId?: string | null;
  onUploadClick?: () => void;
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
  onFileDelete,
  downloadingFileId,
  onUploadClick,
}: FileGridProps) {
  return (
    <div className="space-y-6">
      {folders.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pastas ({folders.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Arquivos ({files.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onDownload={onFileDownload}
                onPreview={onFilePreview}
                onDelete={onFileDelete}
                isDownloading={downloadingFileId === file.id}
              />
            ))}
          </div>
        </div>
      )}

      {folders.length === 0 && files.length === 0 && (
        <EmptyFolderState onUploadClick={onUploadClick} />
      )}
    </div>
  );
}
