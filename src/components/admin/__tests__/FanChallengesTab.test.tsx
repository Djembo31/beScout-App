import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => { const S = () => null; return { Plus: S, Trophy: S, Clock: S, CheckCircle: S, Loader2: S }; });
vi.mock('@/lib/utils', () => ({ cn: (...c: unknown[]) => c.filter(Boolean).join(' ') }));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
}));
vi.mock('@/components/providers/ToastProvider', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/queries/clubChallenges', () => ({
  useClubChallenges: () => ({ data: [], isLoading: false }),
  useCreateChallenge: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import FanChallengesTab from '../FanChallengesTab';

describe('FanChallengesTab', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<FanChallengesTab club={{ id: 'c1' } as any} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders content', () => {
    const { container } = renderWithProviders(<FanChallengesTab club={{ id: 'c1' } as any} />);
    expect(container.innerHTML.length).toBeGreaterThan(20);
  });
});
