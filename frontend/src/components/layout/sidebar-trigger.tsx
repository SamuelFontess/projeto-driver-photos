'use client';

import { useSidebar } from '@/src/contexts/SidebarContext';
import { PanelLeftOpen } from 'lucide-react';

export function SidebarTrigger() {
  const { toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      aria-label="Abrir menu"
    >
      <PanelLeftOpen className="h-5 w-5" />
    </button>
  );
}
