import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import AdminPlayersTab from '../AdminPlayersTab';
import type { ClubWithAdmin, Player } from '@/types';

// ============================================
// Mocks — providers
// ============================================
vi.mock('@/components/providers/AuthProvider', () => {
  const stableUser = { id: 'admin-1' };
  return { useUser: () => ({ user: stableUser }) };
});

// ============================================
// Mocks — services: players
// ============================================
const mockGetPlayersByClubId = vi.fn();
const mockDbToPlayers = vi.fn();
const mockCreatePlayer = vi.fn();
const mockCentsToBsd = vi.fn((n: number) => n / 100);
const mockBsdToCents = vi.fn((n: number) => n * 100);

vi.mock('@/lib/services/players', () => ({
  getPlayersByClubId: (...args: unknown[]) => mockGetPlayersByClubId(...args),
  dbToPlayers: (...args: unknown[]) => mockDbToPlayers(...args),
  createPlayer: (...args: unknown[]) => mockCreatePlayer(...args),
  centsToBsd: (...args: unknown[]) => mockCentsToBsd(...args),
  bsdToCents: (...args: unknown[]) => mockBsdToCents(...args),
}));

// ============================================
// Mocks — services: ipo
// ============================================
const mockGetIposByClubId = vi.fn();
const mockCreateIpo = vi.fn();
const mockUpdateIpoStatus = vi.fn();

vi.mock('@/lib/services/ipo', () => ({
  getIposByClubId: (...args: unknown[]) => mockGetIposByClubId(...args),
  createIpo: (...args: unknown[]) => mockCreateIpo(...args),
  updateIpoStatus: (...args: unknown[]) => mockUpdateIpoStatus(...args),
}));

// ============================================
// Mocks — services: pbt
// ============================================
const mockGetPbtForPlayer = vi.fn();

vi.mock('@/lib/services/pbt', () => ({
  getPbtForPlayer: (...args: unknown[]) => mockGetPbtForPlayer(...args),
}));

// ============================================
// Mocks — services: liquidation
// ============================================
const mockSetSuccessFeeCap = vi.fn();
const mockLiquidatePlayer = vi.fn();

vi.mock('@/lib/services/liquidation', () => ({
  setSuccessFeeCap: (...args: unknown[]) => mockSetSuccessFeeCap(...args),
  liquidatePlayer: (...args: unknown[]) => mockLiquidatePlayer(...args),
}));

// ============================================
// Mocks — adminRoles
// ============================================
const mockCanPerformAction = vi.fn(() => true);

vi.mock('@/lib/adminRoles', () => ({
  canPerformAction: (...args: unknown[]) => mockCanPerformAction(...args),
}));

// ============================================
// Mocks — utils
// ============================================
vi.mock('@/lib/utils', () => ({
  fmtScout: (n: number) => String(n),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Mocks — UI components (stubs)
// ============================================
vi.mock('@/components/player', () => ({
  PlayerIdentity: ({ player }: { player: Player }) => (
    <div data-testid="player-identity">{player.first} {player.last}</div>
  ),
}));

vi.mock('@/components/player/PlayerRow', () => ({
  getSuccessFeeTier: () => ({ label: 'Tier 1', fee: 100, minValue: 0, maxValue: 500000 }),
}));

vi.mock('@/lib/errorMessages', () => ({
  mapErrorToKey: () => 'error',
  normalizeError: () => 'error',
}));

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

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// ============================================
// Fixtures
// ============================================
const club = { id: 'club-1', name: 'Test Club', admin_role: 'admin' } as ClubWithAdmin;
const ownerClub = { id: 'club-1', name: 'Test Club', admin_role: 'owner' } as ClubWithAdmin;

const dbPlayerFixture = {
  id: 'p1',
  first_name: 'Max',
  last_name: 'Mustermann',
  position: 'MID',
  club_id: 'club-1',
  dpc_available: 100,
  floor_price: 500,
  shirt_number: 10,
  age: 25,
  volume_24h: 0,
  is_liquidated: false,
  success_fee_cap: null,
};

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    ticket: 1,
    first: 'Max',
    last: 'Mustermann',
    club: 'Test Club',
    clubId: 'club-1',
    pos: 'MID',
    status: 'fit',
    age: 25,
    country: 'DE',
    contractMonthsLeft: 12,
    perf: { l5: 7, l15: 6.5, l5Apps: 5, l15Apps: 15, season: 7, trend: 'up' },
    stats: { matches: 20, goals: 5, assists: 3, cleanSheets: 0, minutes: 1800, saves: 0 },
    prices: { lastTrade: 500, change24h: 0, floor: 5 },
    dpc: { supply: 300, float: 200, circulation: 100, onMarket: 10, owned: 0 },
    ipo: { status: 'none' },
    listings: [],
    topOwners: [],
    isLiquidated: false,
    successFeeCap: null,
    lastAppearanceGw: 28,
    gwGap: 0,
    ...overrides,
  };
}

const defaultPlayers = [makePlayer()];

const activeIpo = {
  id: 'ipo-1',
  player_id: 'p1',
  status: 'open' as const,
  format: 'standard' as const,
  price: 500,
  total_offered: 100,
  sold: 40,
  max_per_user: 10,
  starts_at: new Date().toISOString(),
  ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  early_access_ends_at: null,
  season: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================
// Helpers
// ============================================
function setupDefaults(opts: { players?: Player[]; ipos?: typeof activeIpo[] } = {}) {
  const players = opts.players ?? defaultPlayers;
  mockGetPlayersByClubId.mockResolvedValue([dbPlayerFixture]);
  mockDbToPlayers.mockReturnValue(players);
  mockGetIposByClubId.mockResolvedValue(opts.ipos ?? []);
  mockCanPerformAction.mockReturnValue(true);
}

// ============================================
// Tests
// ============================================
describe('AdminPlayersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. shows loading state initially
  it('shows loading state initially', () => {
    mockGetPlayersByClubId.mockReturnValue(new Promise(() => {})); // never resolves
    mockGetIposByClubId.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AdminPlayersTab club={club} />);

    // Loading skeleton renders Card stubs with animate-pulse
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    const hasAnimatePulse = cards.some(c => c.className?.includes('animate-pulse'));
    expect(hasAnimatePulse).toBe(true);
  });

  // 2. renders player list after load
  it('renders player list after load', async () => {
    setupDefaults();
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('playerManagement')).toBeInTheDocument();
    });

    expect(screen.getAllByTestId('player-identity').length).toBeGreaterThanOrEqual(1);
  });

  // 3. shows create player button
  it('shows create player button when canCreatePlayerAction=true', async () => {
    setupDefaults();
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('createPlayer')).toBeInTheDocument();
    });
  });

  // 4. create player modal opens on click
  it('create player modal opens on click', async () => {
    setupDefaults();
    const user = userEvent.setup();
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('createPlayer')).toBeInTheDocument();
    });

    // Find the button that has the createPlayer text
    const buttons = screen.getAllByText('createPlayer');
    // Click the first createPlayer button (the one in the header)
    await user.click(buttons[0]);

    // Modal should open with the create player form
    await waitFor(() => {
      expect(screen.getByText('firstName')).toBeInTheDocument();
      expect(screen.getByText('lastName')).toBeInTheDocument();
    });
  });

  // 5. create IPO button shown when canCreateIpo=true
  it('shows create IPO button when canCreateIpo=true', async () => {
    setupDefaults();
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('newIpo')).toBeInTheDocument();
    });
  });

  // 6. IPO modal opens with player selection
  it('IPO modal opens with player selection', async () => {
    setupDefaults();
    const user = userEvent.setup();
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('newIpo')).toBeInTheDocument();
    });

    await user.click(screen.getByText('newIpo'));

    await waitFor(() => {
      expect(screen.getByText('selectPlayer')).toBeInTheDocument();
    });
  });

  // 7. liquidation button shown when canLiquidate=true
  it('shows liquidation button when canLiquidate=true', async () => {
    setupDefaults();
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByLabelText('liquidateLabel')).toBeInTheDocument();
    });
  });

  // 8. set success fee cap button shown when canSetFee=true
  it('shows set success fee cap button when canSetFee=true', async () => {
    setupDefaults();
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByLabelText('setCapLabel')).toBeInTheDocument();
    });
  });

  // 9. hides buttons when role lacks permissions
  it('hides buttons when role lacks permissions', async () => {
    setupDefaults();
    mockCanPerformAction.mockReturnValue(false);
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('playerManagement')).toBeInTheDocument();
    });

    // IPO create button should not be visible
    expect(screen.queryByText('newIpo')).not.toBeInTheDocument();
    // Create player button should not be visible
    expect(screen.queryByText('createPlayer')).not.toBeInTheDocument();
    // No set cap or liquidate buttons
    expect(screen.queryByLabelText('setCapLabel')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('liquidateLabel')).not.toBeInTheDocument();
  });

  // 10. player names rendered
  it('renders player names via PlayerIdentity', async () => {
    const players = [
      makePlayer({ id: 'p1', first: 'Max', last: 'Mustermann' }),
      makePlayer({ id: 'p2', first: 'Anna', last: 'Schmidt' }),
    ];
    setupDefaults({ players });
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
    });
  });

  // 11. handles load error gracefully
  it('handles load error gracefully', async () => {
    mockGetPlayersByClubId.mockRejectedValue(new Error('Network error'));
    mockGetIposByClubId.mockRejectedValue(new Error('Network error'));
    renderWithProviders(<AdminPlayersTab club={club} />);

    // Should finish loading (no crash) and show the player management section
    await waitFor(() => {
      expect(screen.getByText('playerManagement')).toBeInTheDocument();
    });
  });

  // 12. create player calls createPlayer service
  it('create player calls createPlayer service', { timeout: 15000 }, async () => {
    setupDefaults();
    mockCreatePlayer.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('createPlayer')).toBeInTheDocument();
    });

    // Open create player modal
    const createBtns = screen.getAllByText('createPlayer');
    await user.click(createBtns[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('firstName')).toBeInTheDocument();
    });

    // Fill form fields
    await user.type(screen.getByPlaceholderText('firstName'), 'Neuer');
    await user.type(screen.getByPlaceholderText('lastName'), 'Spieler');

    // Fill shirt number — use the input with placeholder examplePrice that is for shirt number
    const numberInputs = screen.getAllByRole('spinbutton');
    // Find the shirt number input (has min=1, max=99) — it is the cpShirtNumber one
    const shirtInput = numberInputs.find(i => i.getAttribute('max') === '99');
    expect(shirtInput).toBeTruthy();
    await user.type(shirtInput!, '7');

    // Fill age input (has min=15, max=45)
    const ageInput = numberInputs.find(i => i.getAttribute('max') === '45');
    expect(ageInput).toBeTruthy();
    await user.type(ageInput!, '22');

    // Submit form — find the createPlayer button inside the modal
    const modalEl = screen.getByTestId('modal');
    const submitBtns = modalEl.querySelectorAll('[data-testid="button"]');
    const submitBtn = Array.from(submitBtns).find(b => b.textContent?.includes('createPlayer'));
    expect(submitBtn).toBeTruthy();
    await user.click(submitBtn!);

    await waitFor(() => {
      expect(mockCreatePlayer).toHaveBeenCalledTimes(1);
      expect(mockCreatePlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Neuer',
          lastName: 'Spieler',
          clubId: 'club-1',
        }),
      );
    });
  });

  // 13. IPO list shown for club
  it('shows IPO list for club', async () => {
    setupDefaults({ ipos: [activeIpo] });
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      // Active IPO count label
      expect(screen.getByText('ipoManagement')).toBeInTheDocument();
    });

    // Player identity for the IPO player
    await waitFor(() => {
      // Should show the player name via PlayerIdentity inside the IPO card
      const identities = screen.getAllByTestId('player-identity');
      expect(identities.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 14. shows active IPO status badge
  it('shows active IPO status badge', async () => {
    setupDefaults({ ipos: [activeIpo] });
    renderWithProviders(<AdminPlayersTab club={club} />);

    await waitFor(() => {
      // The status chip for 'open' IPO uses t('ipoStatusLive') which returns 'ipoStatusLive'
      expect(screen.getByText('ipoStatusLive')).toBeInTheDocument();
    });
  });
});
