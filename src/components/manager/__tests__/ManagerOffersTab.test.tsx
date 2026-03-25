import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => null,
}));
vi.mock('lucide-react', () => {
  const Stub = () => null;
  return {
    Inbox: Stub, Send: Stub, Globe: Stub, Clock: Stub,
    Check: Stub, X: Stub, RotateCcw: Stub, MessageSquare: Stub,
    ArrowRight: Stub, Search: Stub, Plus: Stub, Loader2: Stub,
  };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));
vi.mock('@/lib/services/players', () => ({ centsToBsd: (n: number) => n / 100 }));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="modal">{children}</div> : null,
}));
vi.mock('@/components/player', () => ({
  PlayerIdentity: () => null,
}));
vi.mock('@/components/providers/AuthProvider', () => {
  const stableUser = { id: 'u1' };
  return { useUser: () => ({ user: stableUser }) };
});
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock('@/lib/hooks/useErrorToast', () => ({
  useErrorToast: () => vi.fn(),
}));

const mockGetIncoming = vi.fn();
const mockGetOutgoing = vi.fn();
const mockGetOpenBids = vi.fn();
const mockGetHistory = vi.fn();
vi.mock('@/lib/services/offers', () => ({
  getIncomingOffers: (...args: unknown[]) => mockGetIncoming(...args),
  getOutgoingOffers: (...args: unknown[]) => mockGetOutgoing(...args),
  getOpenBids: (...args: unknown[]) => mockGetOpenBids(...args),
  getOfferHistory: (...args: unknown[]) => mockGetHistory(...args),
  acceptOffer: vi.fn(),
  rejectOffer: vi.fn(),
  counterOffer: vi.fn(),
  cancelOffer: vi.fn(),
  createOffer: vi.fn(),
}));

import ManagerOffersTab from '../ManagerOffersTab';

describe('ManagerOffersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIncoming.mockResolvedValue([]);
    mockGetOutgoing.mockResolvedValue([]);
    mockGetOpenBids.mockResolvedValue([]);
    mockGetHistory.mockResolvedValue([]);
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<ManagerOffersTab players={[]} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('shows sub-tab navigation', () => {
    renderWithProviders(<ManagerOffersTab players={[]} />);
    expect(screen.getByText('tabIncoming')).toBeInTheDocument();
    expect(screen.getByText('tabOutgoing')).toBeInTheDocument();
  });

  it('loads incoming offers on mount', async () => {
    renderWithProviders(<ManagerOffersTab players={[]} />);
    await waitFor(() => {
      expect(mockGetIncoming).toHaveBeenCalled();
    });
  });
});
