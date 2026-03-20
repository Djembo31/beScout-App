import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { GameweekSelector } from '../GameweekSelector';

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
}));
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('GameweekSelector', () => {
  it('shows current gameweek label', () => {
    renderWithProviders(
      <GameweekSelector activeGameweek={11} selectedGameweek={11} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('gameweekN')).toBeInTheDocument();
  });

  it('shows active indicator when selected equals active', () => {
    renderWithProviders(
      <GameweekSelector activeGameweek={11} selectedGameweek={11} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('hides active indicator when selected differs from active', () => {
    renderWithProviders(
      <GameweekSelector activeGameweek={11} selectedGameweek={10} onSelect={vi.fn()} />,
    );
    expect(screen.queryByText('active')).not.toBeInTheDocument();
  });

  it('calls onSelect with previous gameweek', () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <GameweekSelector activeGameweek={11} selectedGameweek={5} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByLabelText('prevGameweek'));
    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it('calls onSelect with next gameweek', () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <GameweekSelector activeGameweek={11} selectedGameweek={5} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByLabelText('nextGameweek'));
    expect(onSelect).toHaveBeenCalledWith(6);
  });

  it('disables prev button at gameweek 1', () => {
    renderWithProviders(
      <GameweekSelector activeGameweek={1} selectedGameweek={1} onSelect={vi.fn()} />,
    );
    expect(screen.getByLabelText('prevGameweek')).toBeDisabled();
  });

  it('disables next button at gameweek 38', () => {
    renderWithProviders(
      <GameweekSelector activeGameweek={38} selectedGameweek={38} onSelect={vi.fn()} />,
    );
    expect(screen.getByLabelText('nextGameweek')).toBeDisabled();
  });

  it('clicking center button jumps to active gameweek', () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <GameweekSelector activeGameweek={11} selectedGameweek={5} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText('gameweekN'));
    expect(onSelect).toHaveBeenCalledWith(11);
  });
});
