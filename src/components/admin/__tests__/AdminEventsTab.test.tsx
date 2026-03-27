import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import '@/test/mocks/supabase'; // activate supabase mock before AdminEventsTab loads
import AdminEventsTab from '../AdminEventsTab';
import type { ClubWithAdmin, DbEvent, GameweekStatus } from '@/types';

// ============================================
// Mocks — providers
// ============================================
vi.mock('@/components/providers/AuthProvider', () => {
  const stableUser = { id: 'admin-1' };
  return { useUser: () => ({ user: stableUser }) };
});

// ============================================
// Mocks — services
// ============================================
const mockGetEventsByClubId = vi.fn();
const mockCreateEvent = vi.fn();
const mockUpdateEventStatus = vi.fn();

vi.mock('@/lib/services/events', () => ({
  getEventsByClubId: (...args: unknown[]) => mockGetEventsByClubId(...args),
  createEvent: (...args: unknown[]) => mockCreateEvent(...args),
  updateEventStatus: (...args: unknown[]) => mockUpdateEventStatus(...args),
}));

const mockSimulateGameweek = vi.fn();
const mockGetGameweekStatuses = vi.fn();

vi.mock('@/lib/services/fixtures', () => ({
  simulateGameweek: (...args: unknown[]) => mockSimulateGameweek(...args),
  getGameweekStatuses: (...args: unknown[]) => mockGetGameweekStatuses(...args),
}));

const mockCentsToBsd = vi.fn((n: number) => n / 100);
const mockBsdToCents = vi.fn((n: number) => n * 100);

vi.mock('@/lib/services/players', () => ({
  centsToBsd: (...args: unknown[]) => mockCentsToBsd(...(args as [number])),
  bsdToCents: (...args: unknown[]) => mockBsdToCents(...(args as [number])),
}));

vi.mock('@/lib/utils', () => ({
  fmtScout: (n: number) => String(n),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Mocks — UI components (stubs)
// ============================================
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  Button: ({ children, onClick, disabled, variant, ...rest }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; [k: string]: unknown }) => (
    <button data-testid="button" data-variant={variant} onClick={onClick} disabled={disabled} aria-label={rest['aria-label'] as string | undefined}>{children}</button>
  ),
  Chip: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="chip" className={className}>{children}</span>
  ),
  Modal: ({ open, children, title, onClose }: { open: boolean; children: React.ReactNode; title?: string; onClose?: () => void }) =>
    open ? <div data-testid="modal" data-title={title}><button data-testid="modal-close" onClick={onClose}>X</button>{children}</div> : null,
}));

vi.mock('../RewardStructureEditor', () => ({
  default: () => <div data-testid="reward-structure-editor">RewardStructureEditor</div>,
}));

vi.mock('@/lib/queries/events', () => ({
  useScoutEventsEnabled: () => false,
}));

// ============================================
// Fixtures
// ============================================
const club = { id: 'club-1', name: 'Test Club' } as ClubWithAdmin;

const now = new Date().toISOString();

function makeEvent(overrides: Partial<DbEvent> = {}): DbEvent {
  return {
    id: 'e1',
    name: 'Test Event',
    status: 'registering',
    type: 'club',
    format: '7er',
    gameweek: 5,
    entry_fee: 0,
    prize_pool: 10000,
    max_entries: 20,
    current_entries: 5,
    starts_at: now,
    locks_at: now,
    ends_at: now,
    event_tier: 'club',
    min_subscription_tier: null,
    salary_cap: null,
    reward_structure: null,
    ...overrides,
  } as DbEvent;
}

function makeGwStatuses(completedGws: number[] = []): GameweekStatus[] {
  return Array.from({ length: 38 }, (_, i) => ({
    gameweek: i + 1,
    total: 10,
    simulated: completedGws.includes(i + 1) ? 10 : 0,
    is_complete: completedGws.includes(i + 1),
  }));
}

function setupResolvedEmpty() {
  mockGetEventsByClubId.mockResolvedValue([]);
  mockGetGameweekStatuses.mockResolvedValue(makeGwStatuses());
}

function setupResolvedWithEvents(events: DbEvent[] = [makeEvent()]) {
  mockGetEventsByClubId.mockResolvedValue(events);
  mockGetGameweekStatuses.mockResolvedValue(makeGwStatuses([1, 2, 3]));
}

function setupNeverResolve() {
  mockGetEventsByClubId.mockReturnValue(new Promise(() => {}));
  mockGetGameweekStatuses.mockReturnValue(new Promise(() => {}));
}

// ============================================
// Tests
// ============================================
describe('AdminEventsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 1. Loading state ---
  it('shows loading state initially', () => {
    setupNeverResolve();
    const { container } = renderWithProviders(<AdminEventsTab club={club} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  // --- 2. Empty state ---
  it('shows empty state when no events', async () => {
    setupResolvedEmpty();
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('noEvents')).toBeInTheDocument();
    });
    expect(screen.getByText('noEventsDesc')).toBeInTheDocument();
  });

  // --- 3. Active events with names ---
  it('renders active events with names', async () => {
    const events = [
      makeEvent({ id: 'e1', name: 'Alpha Cup', status: 'registering' }),
      makeEvent({ id: 'e2', name: 'Beta League', status: 'running' }),
    ];
    setupResolvedWithEvents(events);
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Cup')).toBeInTheDocument();
    });
    expect(screen.getByText('Beta League')).toBeInTheDocument();
  });

  // --- 4. Past events section ---
  it('renders past events section', async () => {
    const events = [
      makeEvent({ id: 'e1', name: 'Active Event', status: 'registering' }),
      makeEvent({ id: 'e2', name: 'Ended Event', status: 'ended' }),
      makeEvent({ id: 'e3', name: 'Cancelled Event', status: 'ended' }),
    ];
    setupResolvedWithEvents(events);
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Ended Event')).toBeInTheDocument();
    });
    expect(screen.getByText('Cancelled Event')).toBeInTheDocument();
    // Past events count label
    expect(screen.getByText('pastEventsCount')).toBeInTheDocument();
  });

  // --- 5. Status badges with correct labels ---
  it('shows status badges with correct labels', async () => {
    const events = [
      makeEvent({ id: 'e1', name: 'Reg Event', status: 'registering' }),
      makeEvent({ id: 'e2', name: 'Live Event', status: 'running' }),
      makeEvent({ id: 'e3', name: 'Done Event', status: 'ended' }),
    ];
    setupResolvedWithEvents(events);
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      // Since useTranslations returns the key, labels are the translation keys
      expect(screen.getByText('evStatusRegistering')).toBeInTheDocument();
    });
    expect(screen.getByText('evStatusLive')).toBeInTheDocument();
    expect(screen.getByText('evStatusEnded')).toBeInTheDocument();
  });

  // --- 6. Start button on registering events ---
  it('shows "Start" button on registering events', async () => {
    setupResolvedWithEvents([makeEvent({ status: 'registering' })]);
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('start')).toBeInTheDocument();
    });
  });

  // --- 7. End button on running events ---
  it('shows "End" button on running events', async () => {
    setupResolvedWithEvents([makeEvent({ status: 'running' })]);
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('end')).toBeInTheDocument();
    });
  });

  // --- 8. Clicking Start calls updateEventStatus ---
  it('clicking Start calls updateEventStatus with running', async () => {
    const user = userEvent.setup();
    const ev = makeEvent({ id: 'ev-start', status: 'registering' });
    setupResolvedWithEvents([ev]);
    mockUpdateEventStatus.mockResolvedValue({ success: true });
    // After status change, re-fetch returns updated event
    mockGetEventsByClubId.mockResolvedValueOnce([ev]).mockResolvedValueOnce([{ ...ev, status: 'running' }]);
    mockGetGameweekStatuses.mockResolvedValue(makeGwStatuses());

    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('start')).toBeInTheDocument();
    });

    // Find the Start button — it contains the 'start' text
    const startButton = screen.getByText('start').closest('button')!;
    await user.click(startButton);

    await waitFor(() => {
      expect(mockUpdateEventStatus).toHaveBeenCalledWith('ev-start', 'running');
    });
  });

  // --- 9. New Event button opens create modal ---
  it('"New Event" button opens create modal', async () => {
    const user = userEvent.setup();
    setupResolvedEmpty();
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('newEvent')).toBeInTheDocument();
    });

    // Modal should NOT be open initially
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();

    await user.click(screen.getByText('newEvent').closest('button')!);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  // --- 10. Create modal has form fields ---
  it('create modal has form fields (name, type, format)', async () => {
    const user = userEvent.setup();
    setupResolvedEmpty();
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('newEvent')).toBeInTheDocument();
    });

    await user.click(screen.getByText('newEvent').closest('button')!);

    const modal = screen.getByTestId('modal');
    // Name label (EventFormModal uses hardcoded German labels)
    expect(within(modal).getByText('Name')).toBeInTheDocument();
    // Type label
    expect(within(modal).getByText('Typ')).toBeInTheDocument();
    // Format label
    expect(within(modal).getByText('Format')).toBeInTheDocument();
  });

  // --- 11. Clone button copies event data into create form ---
  it('clone button copies event data into create form', async () => {
    const user = userEvent.setup();
    const ev = makeEvent({ id: 'e-clone', name: 'Original Event', gameweek: 7, max_entries: 50 });
    setupResolvedWithEvents([ev]);
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Original Event')).toBeInTheDocument();
    });

    // Click the clone button (has aria-label with cloneEvent)
    const cloneBtn = screen.getByLabelText('cloneEvent: Original Event');
    await user.click(cloneBtn);

    // Modal should now be open with cloned data
    const modal = screen.getByTestId('modal');
    expect(modal).toBeInTheDocument();

    // The name field should have clone suffix appended (t('clone') returns 'clone' in mock)
    const nameInput = within(modal).getByPlaceholderText('Event-Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Original Event (clone)');
  });

  // --- 12. Gameweek simulation section renders ---
  it('gameweek simulation section renders', async () => {
    setupResolvedEmpty();
    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('simulateGameweek')).toBeInTheDocument();
    });

    // Simulate button text
    expect(screen.getByText('simulate')).toBeInTheDocument();
  });

  // --- 13. Simulate button calls simulateGameweek ---
  it('simulate button calls simulateGameweek', async () => {
    const user = userEvent.setup();
    setupResolvedEmpty();
    mockSimulateGameweek.mockResolvedValue({ success: true, fixtures_simulated: 5, player_stats_created: 100 });
    // After simulation, refresh statuses
    mockGetGameweekStatuses
      .mockResolvedValueOnce(makeGwStatuses()) // initial load
      .mockResolvedValueOnce(makeGwStatuses([1])); // after simulation

    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('simulate')).toBeInTheDocument();
    });

    const simButton = screen.getByText('simulate').closest('button')!;
    await user.click(simButton);

    await waitFor(() => {
      expect(mockSimulateGameweek).toHaveBeenCalledWith(1);
    });
  });

  // --- 14. GW status grid shows 38 cells ---
  it('GW status grid shows 38 cells', async () => {
    setupResolvedEmpty();
    const { container } = renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('simulateGameweek')).toBeInTheDocument();
    });

    // The GW grid has 38 cells rendered as divs with size-6
    const gwCells = container.querySelectorAll('.size-6');
    expect(gwCells.length).toBe(38);
  });

  // --- 15. Completed GW shows checkmark ---
  it('completed GW shows checkmark in selector', async () => {
    mockGetEventsByClubId.mockResolvedValue([]);
    mockGetGameweekStatuses.mockResolvedValue(makeGwStatuses([3]));

    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('simulateGameweek')).toBeInTheDocument();
    });

    // The select option for GW 3 should contain the checkmark
    const select = screen.getByLabelText('simulateGameweek') as HTMLSelectElement;
    const option3 = within(select).getByText((content) =>
      content.includes('3') && content.includes('\u2713')
    );
    expect(option3).toBeInTheDocument();
  });

  // --- 16. Success message shown after successful action ---
  it('success message shown after successful simulation', async () => {
    const user = userEvent.setup();
    setupResolvedEmpty();
    mockSimulateGameweek.mockResolvedValue({ success: true, fixtures_simulated: 5, player_stats_created: 100 });
    mockGetGameweekStatuses
      .mockResolvedValueOnce(makeGwStatuses())
      .mockResolvedValueOnce(makeGwStatuses([1]));

    renderWithProviders(<AdminEventsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('simulate')).toBeInTheDocument();
    });

    const simButton = screen.getByText('simulate').closest('button')!;
    await user.click(simButton);

    await waitFor(() => {
      // useTranslations returns the key, so success message is 'simulationResult'
      expect(screen.getByText('simulationResult')).toBeInTheDocument();
    });
  });
});
