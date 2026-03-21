import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SearchInput } from '../SearchInput';

vi.mock('lucide-react', () => ({
  Search: () => null,
  X: () => <span data-testid="clear-icon" />,
}));
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('SearchInput', () => {
  it('renders input with placeholder', () => {
    renderWithProviders(<SearchInput value="" onChange={vi.fn()} placeholder="Suche..." />);
    expect(screen.getByPlaceholderText('Suche...')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    renderWithProviders(<SearchInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('shows clear button when value is set', () => {
    renderWithProviders(<SearchInput value="something" onChange={vi.fn()} />);
    expect(screen.getByTestId('clear-icon')).toBeInTheDocument();
  });

  it('hides clear button when value is empty', () => {
    renderWithProviders(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.queryByTestId('clear-icon')).not.toBeInTheDocument();
  });

  it('clears value when clear button clicked', () => {
    const onChange = vi.fn();
    renderWithProviders(<SearchInput value="hello" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('searchClear'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
