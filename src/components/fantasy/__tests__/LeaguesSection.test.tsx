import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Trophy: Stub, Users: Stub, Copy: Stub, Plus: Stub, LogIn: Stub, LogOut: Stub, Crown: Stub, Medal: Stub, Loader2: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div data-testid="modal">{children}</div> : null,
}));
vi.mock('@/components/providers/AuthProvider', () => {
  const stableUser = { id: 'u1' };
  return { useUser: () => ({ user: stableUser }) };
});
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock('@/lib/queries/fantasyLeagues', () => ({
  useMyLeagues: () => ({ data: [], isLoading: false }),
  useLeagueLeaderboard: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/lib/services/fantasyLeagues', () => ({
  createLeague: vi.fn(), joinLeague: vi.fn(), leaveLeague: vi.fn(),
}));
vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { default as LeaguesSectionModule } from '../LeaguesSection';
const LeaguesSection = LeaguesSectionModule;

describe('LeaguesSection', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<LeaguesSection compact={false} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('shows create and join buttons', () => {
    renderWithProviders(<LeaguesSection compact={false} />);
    expect(screen.getByText('create')).toBeInTheDocument();
    expect(screen.getByText('join')).toBeInTheDocument();
  });
});
