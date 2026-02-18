import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filesize } from 'filesize';

export function formatFileSize(bytes: number): string {
  return filesize(bytes, { locale: 'pt-BR' });
}

export function formatDate(dateString: string): string {
  return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatDateShort(dateString: string): string {
  return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
}
