'use client';

import { ChevronRight } from 'lucide-react';
import { type BreadcrumbItem } from '../types';

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onItemClick: (item: BreadcrumbItem) => void;
}

export function BreadcrumbNav({ items, onItemClick }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Navegação por pastas">
      {items.map((item, i) => (
        <div key={item.id ?? 'root'} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="h-4 w-4" />}
          {i === items.length - 1 ? (
            <span className="font-semibold text-foreground">{item.name}</span>
          ) : (
            <button
              type="button"
              onClick={() => onItemClick(item)}
              className="hover:text-foreground transition-colors"
            >
              {item.name}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
