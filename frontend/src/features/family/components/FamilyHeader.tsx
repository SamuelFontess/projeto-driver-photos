'use client';

import Link from 'next/link';
import { Menu, Moon, Plus, Settings, Sun, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
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
import { useSidebar } from '@/src/contexts/SidebarContext';

interface FamilyHeaderProps {
  title: string;
  subtitle: string;
  families: FamilySummary[];
  selectedFamilyId: string | null;
  onFamilyChange: (familyId: string) => void;
  onCreateFamily?: () => void;
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
  onCreateFamily,
  showSettingsMenu = true,
  showBackToFiles = false,
}: FamilyHeaderProps) {
  const { toggleMobile } = useSidebar();
  const { setTheme } = useTheme();

  const selectedFamily =
    selectedFamilyId !== null
      ? families.find((f) => f.id === selectedFamilyId) ?? null
      : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6">

        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={toggleMobile}
          className="md:hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Title + active family (mobile subtitle) */}
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0 overflow-hidden">
            <p className="text-sm font-semibold leading-tight truncate">{title}</p>
            {selectedFamily ? (
              <p className="text-xs text-primary leading-tight truncate sm:hidden">
                {getFamilyLabel(selectedFamily)}
              </p>
            ) : families.length > 0 ? (
              <p className="text-xs text-muted-foreground leading-tight sm:hidden">
                Nenhuma selecionada
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground leading-tight truncate hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Desktop: select + buttons inline */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {families.length > 0 && (
            <Select value={selectedFamilyId ?? undefined} onValueChange={onFamilyChange}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Selecionar família" />
              </SelectTrigger>
              <SelectContent>
                {families.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {getFamilyLabel(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {onCreateFamily && (
            <Button variant="outline" size="sm" onClick={onCreateFamily}>
              <Plus className="h-4 w-4 mr-1" />
              Nova família
            </Button>
          )}

          {showBackToFiles && (
            <Button asChild variant="outline" size="sm">
              <Link href={withFamilyId('/dashboard/family', selectedFamilyId)}>Arquivos</Link>
            </Button>
          )}

          {showSettingsMenu && selectedFamilyId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Configurações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={withFamilyId('/dashboard/family/settings', selectedFamilyId)}>
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Tema</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 h-4 w-4" /> Claro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 h-4 w-4" /> Escuro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  Automático
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile: single ⚙️ dropdown with all options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8 shrink-0" aria-label="Opções">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {families.length > 0 && (
              <>
                <div className="px-2 pt-2 pb-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Família ativa</p>
                  <Select value={selectedFamilyId ?? undefined} onValueChange={onFamilyChange}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Selecionar família" />
                    </SelectTrigger>
                    <SelectContent>
                      {families.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {getFamilyLabel(f)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            {onCreateFamily && (
              <DropdownMenuItem onClick={onCreateFamily}>
                <Plus className="mr-2 h-4 w-4" />
                Nova família
              </DropdownMenuItem>
            )}

            {showBackToFiles && (
              <DropdownMenuItem asChild>
                <Link href={withFamilyId('/dashboard/family', selectedFamilyId)}>
                  Arquivos
                </Link>
              </DropdownMenuItem>
            )}

            {showSettingsMenu && selectedFamilyId && (
              <DropdownMenuItem asChild>
                <Link href={withFamilyId('/dashboard/family/settings', selectedFamilyId)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Tema</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> Escuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              Automático
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
