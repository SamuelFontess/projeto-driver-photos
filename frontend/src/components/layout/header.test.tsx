import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './header';

vi.mock('@/src/components/mode-toggle', () => ({
  ModeToggle: () => <div data-testid="mode-toggle" />,
}));

describe('Header', () => {
  it('calls onSearchChange when user types in search input', () => {
    const handleSearchChange = vi.fn();

    render(<Header searchValue="" onSearchChange={handleSearchChange} />);

    fireEvent.change(screen.getByPlaceholderText('Buscar arquivos...'), {
      target: { value: 'relatorio' },
    });

    expect(handleSearchChange).toHaveBeenCalledWith('relatorio');
  });
});
