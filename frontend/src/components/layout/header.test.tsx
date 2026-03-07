import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '@/src/contexts/SidebarContext';
import { Header } from './header';

vi.mock('@/src/components/mode-toggle', () => ({
  ModeToggle: () => <div data-testid="mode-toggle" />,
}));

function renderHeader(props: React.ComponentProps<typeof Header>) {
  return render(
    <SidebarProvider>
      <Header {...props} />
    </SidebarProvider>
  );
}

describe('Header', () => {
  it('calls onSearchChange when user types in search input', () => {
    const handleSearchChange = vi.fn();

    renderHeader({ searchValue: '', onSearchChange: handleSearchChange });

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), {
      target: { value: 'relatorio' },
    });

    expect(handleSearchChange).toHaveBeenCalledWith('relatorio');
  });
});
