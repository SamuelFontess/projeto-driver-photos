import {
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileCode2,
  FileArchive,
  FileSpreadsheet,
} from 'lucide-react';
import type { ComponentType } from 'react';

interface FileIconConfig {
  icon: ComponentType<{ className?: string }>;
  className: string;
}

export function getFileIconConfig(mimeType?: string | null): FileIconConfig {
  if (!mimeType) return { icon: File, className: 'text-muted-foreground' };

  if (mimeType.startsWith('image/')) {
    return { icon: FileImage, className: 'text-blue-500' };
  }
  if (mimeType.startsWith('video/')) {
    return { icon: FileVideo, className: 'text-purple-500' };
  }
  if (mimeType.startsWith('audio/')) {
    return { icon: FileAudio, className: 'text-green-500' };
  }
  if (mimeType === 'application/pdf') {
    return { icon: FileText, className: 'text-red-500' };
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'text/csv'
  ) {
    return { icon: FileSpreadsheet, className: 'text-emerald-500' };
  }
  if (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-rar-compressed' ||
    mimeType === 'application/x-tar' ||
    mimeType === 'application/gzip'
  ) {
    return { icon: FileArchive, className: 'text-amber-500' };
  }
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    mimeType === 'application/javascript' ||
    mimeType === 'application/typescript'
  ) {
    return { icon: FileCode2, className: 'text-orange-500' };
  }

  return { icon: File, className: 'text-muted-foreground' };
}
