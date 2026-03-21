import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ScoringRules } from '../ScoringRules';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Info: Stub, ChevronDown: Stub, ChevronUp: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('ScoringRules', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<ScoringRules />);
    expect(container.innerHTML).not.toBe('');
  });

  it('shows expand button', () => {
    renderWithProviders(<ScoringRules />);
    // Should have a clickable element to expand
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('expands on click to show more content', () => {
    const { container } = renderWithProviders(<ScoringRules />);
    const initialLength = container.innerHTML.length;
    const btn = screen.getAllByRole('button')[0];
    fireEvent.click(btn);
    // After expand, content should be longer
    expect(container.innerHTML.length).toBeGreaterThan(initialLength);
  });
});
