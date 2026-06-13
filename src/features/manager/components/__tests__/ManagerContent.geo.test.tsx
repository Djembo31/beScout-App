import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManagerContent from '../ManagerContent';

const mockRawSell = vi.fn(() => Promise.resolve({ success: true }));
const mockRawCancel = vi.fn(() => Promise.resolve({ success: true }));
const mockRegionToast = vi.fn();
let mockTradingAllowed = true;

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({ user: { id: 'u1' }, loading: false }),
}));

vi.mock('@/lib/useRegionGuard', () => ({
  useRegionGuard: () => ({
    allowed: mockTradingAllowed,
    geofencingEnabled: true,
    isHydrated: true,
    tier: mockTradingAllowed ? 'FULL' : 'TIER_RESTRICTED',
    guard: <T,>(action: () => Promise<T>) => async () => {
      if (!mockTradingAllowed) {
        mockRegionToast('restricted');
        return undefined;
      }
      return action();
    },
  }),
}));

vi.mock('@/features/market/hooks/useTradeActions', () => ({
  useTradeActions: () => ({
    handleSell: mockRawSell,
    handleCancelOrder: mockRawCancel,
  }),
}));

vi.mock('../../hooks/useManagerData', () => ({
  useManagerData: () => ({
    players: [],
    mySquadPlayers: [],
    healthCounts: { fit: 0, doubtful: 0, injured: 0 },
    playersLoading: false,
    playersError: false,
    holdings: [],
    ipoList: [],
    incomingOffers: [],
  }),
}));

vi.mock('../../queries/eventQueries', () => ({
  useOpenEvents: () => ({ events: [] }),
}));

vi.mock('../../store/managerStore', () => ({
  useManagerStore: (selector: (s: Record<string, unknown>) => unknown) => selector({
    activeTab: 'kader',
    setActiveTab: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/manager',
  useSearchParams: () => new URLSearchParams('tab=kader'),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual, useQueryClient: () => ({ refetchQueries: vi.fn() }) };
});

vi.mock('@/components/ui/TabBar', () => ({
  TabBar: () => <div data-testid="tab-bar" />,
  TabPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui', () => ({
  SkeletonCard: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => <button data-testid="retry" onClick={onRetry}>retry</button>,
}));

vi.mock('@/components/missions/MissionHintList', () => ({
  default: () => <div data-testid="mission-hints" />,
}));

vi.mock('../PageHeader', () => ({
  default: () => <div data-testid="manager-header" />,
}));

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>) => {
    const source = String(loader);
    if (source.includes('KaderTab')) {
      return function KaderTabStub(props: {
        onSell: (playerId: string, quantity: number, priceCents: number) => Promise<unknown>;
        onCancelOrder: (orderId: string) => Promise<unknown>;
      }) {
        return (
          <div data-testid="kader-tab">
            <button data-testid="manager-sell" onClick={() => props.onSell('p1', 1, 100)}>sell</button>
            <button data-testid="manager-cancel" onClick={() => props.onCancelOrder('o1')}>cancel</button>
          </div>
        );
      };
    }
    return function DynamicStub() {
      return <div data-testid="dynamic-stub" />;
    };
  },
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <span />,
  Users: () => <span />,
  Briefcase: () => <span />,
  History: () => <span />,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ManagerContent geo trading guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTradingAllowed = true;
  });

  it('blocks Kader sell/cancel trading actions when dpc_trading is geo-restricted', async () => {
    mockTradingAllowed = false;

    render(<ManagerContent />);
    await userEvent.click(screen.getByTestId('manager-sell'));
    await userEvent.click(screen.getByTestId('manager-cancel'));

    expect(mockRawSell).not.toHaveBeenCalled();
    expect(mockRawCancel).not.toHaveBeenCalled();
    expect(mockRegionToast).toHaveBeenCalledTimes(2);
  });
});
