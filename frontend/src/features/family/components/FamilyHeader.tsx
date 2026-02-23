'use client';

import Link from 'next/link';
import { Settings, Users } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui';
import { type FamilySummary } from '@/src/lib/api';

interface FamilyHeaderProps {
  title: string;
  subtitle: string;
  families: FamilySummary[];
  selectedFamilyId: string | null;
  onFamilyChange: (familyId: string) => void;
  showSettingsMenu?: boolean;
  showBackToFiles?: boolean;
}

function getFamilyLabel(family: FamilySummary): string {
  if (family.name && family.name.trim()) {
    return family.name;
  }
  return `Família ${family.id.slice(0, 8)}`;
}

function withFamilyId(path: string, familyId: string | null): string {
  if (!familyId) return path;
  const params = new URLSearchParams();
  params.set('familyId', familyId);
  return `${path}?${params.toString()}`;
}

export function FamilyHeader({
  title,
  subtitle,
  families,
  selectedFamilyId,
  onFamilyChange,
  showSettingsMenu = true,
  showBackToFiles = false,
}: FamilyHeaderProps) {
  const selectedFamily =
    selectedFamilyId !== null
      ? families.find((family) => family.id === selectedFamilyId) ?? null
      : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-6 py-2">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            {selectedFamily ? (
              <p className="text-xs font-medium text-primary">
                Bem-vindo(a) a {getFamilyLabel(selectedFamily)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {families.length > 0 ? (
            <Select value={selectedFamilyId ?? undefined} onValueChange={onFamilyChange}>
              <SelectTrigger className="min-w-56">
                <SelectValue placeholder="Selecionar família" />
              </SelectTrigger>
              <SelectContent>
                {families.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                  {getFamilyLabel(family)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {showBackToFiles ? (
            <Button asChild variant="outline" size="sm">
              <Link href={withFamilyId('/dashboard/family', selectedFamilyId)}>Arquivos</Link>
            </Button>
          ) : null}

          {showSettingsMenu && selectedFamilyId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-2" aria-label="Configurações da família">
                  <Settings className="h-4 w-4" />
                  Configurações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Configurações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={withFamilyId('/dashboard/family/settings/invites', selectedFamilyId)}>
                    Convidar membros
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={withFamilyId('/dashboard/family/settings/invitations', selectedFamilyId)}>
                    Convites pendentes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={withFamilyId('/dashboard/family/settings/members', selectedFamilyId)}>
                    Membros
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}
