'use client';

import React from 'react';
import { Menu, Search } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { ModeToggle } from '@/src/components/mode-toggle';
import { useSidebar } from '@/src/contexts/SidebarContext';

interface HeaderProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  breadcrumbs?: Array<{ id: string | null; name: string }>;
  onBreadcrumbClick?: (item: { id: string | null; name: string }) => void;
}

export function Header({
  searchValue = '',
  onSearchChange,
  breadcrumbs,
  onBreadcrumbClick
}: HeaderProps) {
  const { toggleMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-4 sm:px-6">
        {/* Hamburger button — mobile only */}
        <button
          type="button"
          onClick={toggleMobile}
          className="md:hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 overflow-hidden">
            {breadcrumbs.map((item, i) => (
              <div key={item.id ?? 'root'} className="flex items-center gap-2 shrink-0">
                {i > 0 && <span>/</span>}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">{item.name}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBreadcrumbClick?.(item)}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </button>
                )}
              </div>
            ))}
          </nav>
        )}

        <div className="ml-auto flex flex-1 items-center gap-2 sm:gap-4 justify-end">
          {onSearchChange && (
            <div className="relative flex-1 max-w-[140px] sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 sm:pl-9 h-8 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
