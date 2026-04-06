import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { FantasyEvent, UserDpcHolding } from '../types';

// ============================================
// Mocks — next/dynamic
// ============================================
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_loader: unknown, _opts?: unknown) => {
    const DynamicStub = (props: Record<string, unknown>) => {
      if ('participantCount' in props) {
        const ev = props.event as { name?: string } | undefined;
        return <div data-testid="overview-panel">{ev?.name ?? ''} Overview</div>;
      }
      if ('formationSlots' in props) {
        return <div data-testid="lineup-panel">LineupPanel</div>;
      }
      if ('leaderboardLoading' in props) {
        return <div data-testid="leaderboard-panel">LeaderboardPanel</div>;
      }
      if ('eventStatus' in props) {
        return <div data-testid="event-community-tab">EventCommunityTab</div>;
      }
      return <div data-testid="dynamic-stub" />;
    };
    DynamicStub.displayName = 'DynamicStub';
    return DynamicStub;
  },
}));

// ============================================
// Mocks — lucide-react
// ============================================
vi.mock('lucide-react', () => {
  const Stub = () => null;
  return {
    Trophy: Stub, Users: Stub, Clock: Stub, Crown: Stub,
    CheckCircle2: Stub, Play: Stub, Lock: Stub, Save: Stub,
    Eye: Stub, RefreshCw: Stub, History: Stub, Loader2: Stub,
    Sparkles: Stub, Building2: Stub, Gift: Stub, UserPlus: Stub,
    Star: Stub, Swords: Stub,
  };
});

// ============================================
// Mocks — heavy deps
// ============================================
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }),
    rpc: () => ({ data: null, error: null }),
  },
}));

// CRITICAL: user object MUST be a stable reference.
// EventDetailModal has `user` in a useEffect dep array.
// A new object each render → infinite loop → OOM crash.
vi.mock('@/components/providers/AuthProvider', () => {
  const stableUser = { id: 'u1' };
  return {
    useUser: () => ({ user: stableUser }),
  };
});

vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title, onClose }: { open: boolean; children: React.ReactNode; title?: string; onClose?: () => void }) =>
    open ? <div data-testid="modal" data-title={title}><button data-testid="modal-close" onClick={onClose}>close</button>{children}</div> : null,
  Button: ({ children, onClick, disabled, ...rest }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; [k: string]: unknown }) => (
    <button data-testid="button" onClick={onClick} disabled={!!disabled} data-variant={rest.variant}>{children}</button>
  ),
  Chip: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="chip" className={className}>{children}</span>
  ),
  EventScopeBadge: ({ scope }: { scope: string }) => (
    <span data-testid="event-scope-badge">{scope}</span>
  ),
}));

vi.mock('@/types', () => ({
  calculateSynergyPreview: () => ({ totalPct: 0, details: [] }),
}));

// ============================================
// Mocks — services (use vi.fn() for spying)
// ============================================
const mockGetLineup = vi.fn();
const mockGetEventParticipants = vi.fn();
const mockGetEventParticipantCount = vi.fn();
vi.mock('@/lib/services/lineups', () => ({
  getLineup: (...args: unknown[]) => mockGetLineup(...args),
  getEventParticipants: (...args: unknown[]) => mockGetEventParticipants(...args),
  getEventParticipantCount: (...args: unknown[]) => mockGetEventParticipantCount(...args),
}));

const mockGetEventLeaderboard = vi.fn();
const mockGetProgressiveScores = vi.fn();
vi.mock('@/lib/services/scoring', () => ({
  resetEvent: vi.fn(),
  getEventLeaderboard: (...args: unknown[]) => mockGetEventLeaderboard(...args),
  getProgressiveScores: (...args: unknown[]) => mockGetProgressiveScores(...args),
}));

// ============================================
// Mocks — lazy-loaded modules
// ============================================
vi.mock('../event-tabs/OverviewPanel', () => ({ default: () => null }));
vi.mock('../event-tabs/LineupPanel', () => ({ default: () => null }));
vi.mock('../event-tabs/LeaderboardPanel', () => ({ default: () => null }));
vi.mock('../EventCommunityTab', () => ({ default: () => null }));
vi.mock('@/components/gamification/EquipmentPicker', () => ({ default: () => null }));

// ============================================
// Mocks — extracted sub-components
// ============================================
vi.mock('@/features/fantasy/components/event-detail/EventDetailHeader', () => ({
  EventDetailHeader: ({ event, isScored }: { event: { name: string; status: string; participants: number; maxParticipants?: number | null }; isScored: boolean }) => (
    <div data-testid="event-detail-header">
      <span>{isScored ? 'statusScored' : `status_${event.status}`}</span>
      <span>{event.participants}{event.maxParticipants ? `/${event.maxParticipants}` : ''}</span>
    </div>
  ),
}));
vi.mock('@/features/fantasy/components/event-detail/EventDetailFooter', () => ({
  EventDetailFooter: ({ event, onConfirmJoin, onSaveLineup, onLeave, onViewResults }: { event: { isJoined: boolean; status: string }; onConfirmJoin: () => void; onSaveLineup: () => void; onLeave: () => void; onViewResults: () => void }) => {
    // Render a join button when not joined and event not running/ended (matching original logic)
    if (!event.isJoined && event.status !== 'ended' && event.status !== 'running') {
      return (
        <div data-testid="event-detail-footer">
          <button data-testid="button" data-variant="gold" onClick={onConfirmJoin}>confirmRegistration</button>
        </div>
      );
    }
    return (
      <div data-testid="event-detail-footer">
        <button data-testid="button" onClick={onSaveLineup}>save</button>
        <button data-testid="button" onClick={onLeave}>leave</button>
      </div>
    );
  },
}));
vi.mock('@/features/fantasy/components/event-detail/JoinConfirmDialog', () => ({
  JoinConfirmDialog: ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
    <div data-testid="join-confirm-dialog">
      <button data-testid="join-confirm" onClick={onConfirm}>confirm</button>
      <button data-testid="join-cancel" onClick={onCancel}>cancel</button>
    </div>
  ),
}));

// ============================================
// Mocks — constants & helpers
// ============================================
vi.mock('../constants', () => ({
  getFormationsForFormat: () => [
    {
      id: '1-3-2-1',
      name: 'Defensiv (3-2-1)',
      slots: [
        { pos: 'GK', count: 1 },
        { pos: 'DEF', count: 3 },
        { pos: 'MID', count: 2 },
        { pos: 'ATT', count: 1 },
      ],
    },
  ],
  getDefaultFormation: () => '1-3-2-1',
  buildSlotDbKeys: () => ['gk', 'def1', 'def2', 'def3', 'mid1', 'mid2', 'att'],
  PRESET_KEY: 'bescout-lineup-presets',
}));

vi.mock('../helpers', () => ({
  getStatusStyle: (status: string) => ({
    bg: 'bg-sky-500',
    text: 'text-white',
    labelKey: `status_${status}`,
    pulse: false,
  }),
  getTypeStyle: () => ({
    color: 'text-green-500',
    bg: 'bg-green-500/15',
    icon: () => null,
  }),
  formatCountdown: () => '2h 30m',
}));

// eslint-disable-next-line import/first
import { EventDetailModal } from '../EventDetailModal';

// ============================================
// Fixtures — IMPORTANT: status='registering' avoids setInterval polling
// ============================================
function makeEvent(overrides: Partial<FantasyEvent> = {}): FantasyEvent {
  return {
    id: 'e1',
    name: 'Test Event',
    description: 'A test event',
    status: 'registering',
    format: '7er',
    type: 'club',
    mode: 'tournament',
    gameweek: 5,
    entryFeeCents: 0,
    buyIn: 0,
    prizePool: 10000,
    maxParticipants: 20,
    participants: 5,
    isJoined: false,
    scoredAt: null,
    eventTier: 'club',
    startTime: Date.now() + 86400000,
    endTime: Date.now() + 172800000,
    lockTime: Date.now() + 86400000,
    entryType: 'single',
    speed: 'normal',
    isPromoted: false,
    isFeatured: false,
    isInterested: false,
    requirements: {},
    rewards: [],
    ticketCost: 0,
    currency: 'tickets' as const,
    ...overrides,
  };
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onJoin: vi.fn(),
  onSubmitLineup: vi.fn(),
  onLeave: vi.fn(),
  onReset: vi.fn(),
  userHoldings: [] as UserDpcHolding[],
  fixtureDeadlines: new Map(),
};

// ============================================
// Tests
// ============================================
describe('EventDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLineup.mockResolvedValue(null);
    mockGetEventParticipants.mockResolvedValue([]);
    mockGetEventParticipantCount.mockResolvedValue(5);
    mockGetEventLeaderboard.mockResolvedValue([]);
    mockGetProgressiveScores.mockResolvedValue(new Map());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    const event = makeEvent();
    const { container } = renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} isOpen={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when event is null', () => {
    const { container } = renderWithProviders(
      <EventDetailModal {...defaultProps} event={null} isOpen={true} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders modal with event name as title', async () => {
    const event = makeEvent({ name: 'Cup Final' });
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      const modal = screen.getByTestId('modal');
      expect(modal).toBeInTheDocument();
      expect(modal.getAttribute('data-title')).toBe('Cup Final');
    });
  });

  it('shows all 4 tab buttons', async () => {
    const event = makeEvent();
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      expect(screen.getByText('tabOverview')).toBeInTheDocument();
      expect(screen.getByText('tabLineup')).toBeInTheDocument();
      expect(screen.getByText('tabRanking')).toBeInTheDocument();
      expect(screen.getByText('tabCommunity')).toBeInTheDocument();
    });
  });

  it('defaults to overview tab for non-joined events', async () => {
    const event = makeEvent({ isJoined: false, scoredAt: null });
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('overview-panel')).toBeInTheDocument();
    });
  });

  it('switches panel when a different tab is clicked', async () => {
    const user = userEvent.setup();
    const event = makeEvent();
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('overview-panel')).toBeInTheDocument();
    });

    await user.click(screen.getByText('tabRanking'));
    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-panel')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('overview-panel')).not.toBeInTheDocument();
  });

  it('shows event status badge', async () => {
    const event = makeEvent({ status: 'registering' });
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      expect(screen.getByText('status_registering')).toBeInTheDocument();
    });
  });

  it('shows participant count with max', async () => {
    const event = makeEvent({ participants: 5, maxParticipants: 20 });
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      expect(screen.getByText('5/20')).toBeInTheDocument();
    });
  });

  it('calls getLineup when user has joined', async () => {
    const event = makeEvent({ isJoined: true });
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      expect(mockGetLineup).toHaveBeenCalledWith('e1', 'u1');
    });
  });

  it('calls getEventParticipants and getEventParticipantCount on open', async () => {
    const event = makeEvent();
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      expect(mockGetEventParticipants).toHaveBeenCalledWith('e1', 10);
      expect(mockGetEventParticipantCount).toHaveBeenCalledWith('e1');
    });
  });

  it('renders OverviewPanel in overview tab', async () => {
    const event = makeEvent({ name: 'My Event' });
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      const panel = screen.getByTestId('overview-panel');
      expect(panel).toBeInTheDocument();
      expect(panel.textContent).toContain('My Event');
    });
  });

  it('renders LeaderboardPanel when leaderboard tab is selected', async () => {
    const user = userEvent.setup();
    const event = makeEvent();
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      expect(screen.getByText('tabRanking')).toBeInTheDocument();
    });

    await user.click(screen.getByText('tabRanking'));
    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-panel')).toBeInTheDocument();
    });
  });

  it('calls onClose when modal close is triggered', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const event = makeEvent();
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} onClose={onClose} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows join button for registering event', async () => {
    const event = makeEvent({ status: 'registering', isJoined: false, buyIn: 0 });
    renderWithProviders(
      <EventDetailModal {...defaultProps} event={event} />,
    );
    await waitFor(() => {
      const buttons = screen.getAllByTestId('button');
      const joinArea = buttons.find(b => b.textContent?.includes('confirmRegistration'));
      expect(joinArea).toBeInTheDocument();
    });
  });
});
