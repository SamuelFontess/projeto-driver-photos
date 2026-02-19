'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { ModeToggle } from '@/src/components/mode-toggle';

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
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((item, i) => (
              <div key={item.id ?? 'root'} className="flex items-center gap-2">
                {i > 0 && <span>/</span>}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-foreground">{item.name}</span>
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
        
        <div className="ml-auto flex flex-1 items-center gap-4 justify-end">
          {onSearchChange && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar arquivos..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
