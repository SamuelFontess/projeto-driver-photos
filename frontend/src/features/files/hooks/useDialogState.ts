import { useState } from 'react';
import type { Folder, FolderFile } from '@/src/lib/api';

export interface DialogState {
  rename: {
    folderId: string | null;
    folderName: string;
    open: (folder: Folder) => void;
    close: () => void;
    setName: (name: string) => void;
  };
  move: {
    folderId: string | null;
    targetParentId: string | null;
    open: (folder: Folder) => void;
    close: () => void;
    setTargetParentId: (id: string | null) => void;
  };
  deleteFolder: {
    folderId: string | null;
    open: (folder: Folder) => void;
    close: () => void;
  };
  deleteFile: {
    fileId: string | null;
    open: (file: FolderFile) => void;
    close: () => void;
  };
}

export function useDialogState(): DialogState {
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');

  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);
  const [moveTargetParentId, setMoveTargetParentId] = useState<string | null>(null);

  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);

  return {
    rename: {
      folderId: renameFolderId,
      folderName: renameFolderName,
      open: (folder) => {
        setRenameFolderId(folder.id);
        setRenameFolderName(folder.name);
      },
      close: () => {
        setRenameFolderId(null);
        setRenameFolderName('');
      },
      setName: setRenameFolderName,
    },
    move: {
      folderId: moveFolderId,
      targetParentId: moveTargetParentId,
      open: (folder) => {
        setMoveFolderId(folder.id);
        setMoveTargetParentId(folder.parentId);
      },
      close: () => {
        setMoveFolderId(null);
        setMoveTargetParentId(null);
      },
      setTargetParentId: setMoveTargetParentId,
    },
    deleteFolder: {
      folderId: deleteFolderId,
      open: (folder) => setDeleteFolderId(folder.id),
      close: () => setDeleteFolderId(null),
    },
    deleteFile: {
      fileId: deleteFileId,
      open: (file) => setDeleteFileId(file.id),
      close: () => setDeleteFileId(null),
    },
  };
}
