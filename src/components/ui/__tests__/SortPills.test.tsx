import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SortPills } from '../SortPills';

vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

const options = [
  { id: 'new', label: 'Neu' },
  { id: 'top', label: 'Top', count: 42 },
  { id: 'trending', label: 'Trending' },
];

describe('SortPills', () => {
  it('renders all options', () => {
    render(<SortPills options={options} active="new" onChange={vi.fn()} />);
    expect(screen.getByText('Neu')).toBeInTheDocument();
    expect(screen.getByText('Top')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });

  it('calls onChange when pill clicked', () => {
    const onChange = vi.fn();
    render(<SortPills options={options} active="new" onChange={onChange} />);
    fireEvent.click(screen.getByText('Top'));
    expect(onChange).toHaveBeenCalledWith('top');
  });

  it('shows count badge when provided', () => {
    render(<SortPills options={options} active="new" onChange={vi.fn()} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('highlights active pill', () => {
    render(<SortPills options={options} active="top" onChange={vi.fn()} />);
    const topBtn = screen.getByText('Top').closest('button');
    expect(topBtn?.className).toContain('bg-gold');
  });
});
