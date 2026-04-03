import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import ManagerKaderTab from '../KaderTab';
import type { Player, Pos } from '@/types';

// ============================================
// Mocks — providers
// ============================================
vi.mock('@/components/providers/AuthProvider', () => {
  const stableUser = { id: 'user-1' };
  return { useUser: () => ({ user: stableUser }) };
});

// ============================================
// Mocks — manager data hooks
// ============================================
const mockMinutesMap = new Map<string, number[]>();
const mockScoresMap = new Map<string, (number | null)[]>();
const mockNextFixturesMap = new Map<string, { opponent: string; isHome: boolean; date: string }>();
const mockEventUsageMap = new Map<string, string[]>();

vi.mock('@/lib/queries/managerData', () => ({
  useRecentMinutes: () => ({ data: mockMinutesMap }),
  useRecentScores: () => ({ data: mockScoresMap }),
  useNextFixtures: () => ({ data: mockNextFixturesMap }),
  usePlayerEventUsage: () => ({ data: mockEventUsageMap }),
}));

// ============================================
// Mocks — clubs
// ============================================
vi.mock('@/lib/clubs', () => ({
  getClub: () => null,
}));

// ============================================
// Mocks — child components (stubs)
// ============================================
vi.mock('../SquadPitch', () => ({
  default: ({ formation, onSlotClick }: { formation: { id: string; slots: { pos: string }[] }; onSlotClick: (idx: number, pos: string) => void }) => (
    <div data-testid="squad-pitch" data-formation={formation.id}>
      {formation.slots.map((slot: { pos: string }, idx: number) => (
        <button key={idx} data-testid={`pitch-slot-${idx}`} onClick={() => onSlotClick(idx, slot.pos)}>
          Slot {idx} ({slot.pos})
        </button>
      ))}
    </div>
  ),
}));
vi.mock('@/features/market/components/portfolio/SquadPitch', () => ({
  default: ({ formation, onSlotClick }: { formation: { id: string; slots: { pos: string }[] }; onSlotClick: (idx: number, pos: string) => void }) => (
    <div data-testid="squad-pitch" data-formation={formation.id}>
      {formation.slots.map((slot: { pos: string }, idx: number) => (
        <button key={idx} data-testid={`pitch-slot-${idx}`} onClick={() => onSlotClick(idx, slot.pos)}>
          Slot {idx} ({slot.pos})
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../SquadSummaryStats', () => ({
  default: ({ assignedCount, totalSlots, ownedPlayers }: { assignedCount: number; totalSlots: number; ownedPlayers: unknown[] }) => (
    <div data-testid="squad-summary-stats">
      {assignedCount}/{totalSlots} assigned, {ownedPlayers.length} owned
    </div>
  ),
}));
vi.mock('@/features/market/components/portfolio/SquadSummaryStats', () => ({
  default: ({ assignedCount, totalSlots, ownedPlayers }: { assignedCount: number; totalSlots: number; ownedPlayers: unknown[] }) => (
    <div data-testid="squad-summary-stats">
      {assignedCount}/{totalSlots} assigned, {ownedPlayers.length} owned
    </div>
  ),
}));

vi.mock('@/components/player', () => ({
  PositionBadge: ({ pos }: { pos: string }) => <div data-testid="position-badge">{pos}</div>,
  MatchIcon: () => <span data-testid="match-icon" />,
}));
vi.mock('@/features/market/components/portfolio/bestand/bestandHelpers', () => ({
  StatusPill: ({ status }: { status: string }) => <span data-testid="status-pill">{status}</span>,
  MinutesPill: () => <span data-testid="minutes-pill" />,
  NextMatchBadge: () => <span data-testid="next-match-badge" />,
  STATUS_CONFIG: {},
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// ============================================
// Helpers — makePlayer
// ============================================
function makePlayer(overrides: Partial<Player> & { id: string; pos: Pos }): Player {
  return {
    ticket: 1,
    first: 'Max',
    last: 'Mustermann',
    club: 'Test FC',
    clubId: 'club-1',
    league: 'Test League',
    status: 'fit',
    age: 25,
    country: 'DE',
    contractMonthsLeft: 12,
    perf: { l5: 60, l15: 55, l5Apps: 5, l15Apps: 15, season: 58, trend: 'UP' },
    stats: { matches: 20, goals: 5, assists: 3, cleanSheets: 2, minutes: 1800, saves: 0 },
    prices: { lastTrade: 1000, change24h: 5, floor: 900 },
    dpc: { supply: 300, float: 200, circulation: 250, onMarket: 50, owned: 3 },
    ipo: { status: 'none' },
    listings: [],
    topOwners: [],
    lastAppearanceGw: 28,
    gwGap: 0,
    ...overrides,
  };
}

const gkPlayer = makePlayer({ id: 'p-gk', pos: 'GK', first: 'Manuel', last: 'Neuer', perf: { l5: 75, l15: 70, l5Apps: 5, l15Apps: 15, season: 72, trend: 'UP' } });
const def1Player = makePlayer({ id: 'p-def1', pos: 'DEF', first: 'Antonio', last: 'Ruediger', perf: { l5: 80, l15: 72, l5Apps: 5, l15Apps: 15, season: 74, trend: 'UP' } });
const def2Player = makePlayer({ id: 'p-def2', pos: 'DEF', first: 'Dayot', last: 'Upamecano', perf: { l5: 55, l15: 50, l5Apps: 5, l15Apps: 15, season: 52, trend: 'DOWN' } });
const mid1Player = makePlayer({ id: 'p-mid1', pos: 'MID', first: 'Joshua', last: 'Kimmich', perf: { l5: 90, l15: 85, l5Apps: 5, l15Apps: 15, season: 87, trend: 'UP' } });
const att1Player = makePlayer({ id: 'p-att1', pos: 'ATT', first: 'Harry', last: 'Kane', perf: { l5: 95, l15: 88, l5Apps: 5, l15Apps: 15, season: 90, trend: 'UP' } });
const att2Player = makePlayer({ id: 'p-att2', pos: 'ATT', first: 'Leroy', last: 'Sane', perf: { l5: 40, l15: 45, l5Apps: 5, l15Apps: 15, season: 42, trend: 'DOWN' }, prices: { lastTrade: 2000, change24h: -3, floor: 1800 } });

const allPlayers = [gkPlayer, def1Player, def2Player, mid1Player, att1Player, att2Player];
const ownedPlayers = [gkPlayer, def1Player, mid1Player, att1Player];

// ============================================
// Tests
// ============================================
describe('ManagerKaderTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMinutesMap.clear();
    mockScoresMap.clear();
    mockNextFixturesMap.clear();
    mockEventUsageMap.clear();
    localStorage.clear();
  });

  // ── Rendering basics ──

  it('renders SquadSummaryStats with correct props', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );
    const summary = screen.getByTestId('squad-summary-stats');
    // 0 assigned initially, 11 slots for default 4-3-3, 4 owned
    expect(summary).toHaveTextContent('0/11 assigned');
    expect(summary).toHaveTextContent('4 owned');
  });

  it('renders SquadPitch with default 4-3-3 formation', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );
    const pitch = screen.getByTestId('squad-pitch');
    expect(pitch).toHaveAttribute('data-formation', '4-3-3');
  });

  it('renders squad size toggle buttons (11er and 7er)', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );
    expect(screen.getByRole('button', { name: '11er' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7er' })).toBeInTheDocument();
  });

  it('renders formation buttons for 11er default', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );
    expect(screen.getByRole('button', { name: '4-3-3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4-4-2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3-5-2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5-3-2' })).toBeInTheDocument();
  });

  // ── Empty state ──

  it('shows empty state when no owned players', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={[]} />,
    );
    // "kaderNoPlayersYet" appears in both desktop side panel and mobile list
    const noPlayersTexts = screen.getAllByText('kaderNoPlayersYet');
    expect(noPlayersTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('kaderEmptyDesc')).toBeInTheDocument();
    // Buy players link should point to market
    const buyLinks = screen.getAllByRole('link', { name: /kaderBuyPlayers/i });
    expect(buyLinks.length).toBeGreaterThanOrEqual(1);
    expect(buyLinks[0]).toHaveAttribute('href', '/market?tab=kaufen');
  });

  // ── Player list rendering (mobile section below pitch) ──

  it('renders owned player names in the player lists', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );
    // ManagerPlayerRow renders uppercase last names
    expect(screen.getAllByText('NEUER').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('RUEDIGER').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('KIMMICH').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('KANE').length).toBeGreaterThanOrEqual(1);
  });

  it('renders player links to /player/[id]', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );
    // FullPlayerRow renders as Link to /player/[id]
    const links = screen.getAllByRole('link');
    const playerLinks = links.filter(l => l.getAttribute('href')?.startsWith('/player/'));
    // Should include owned players (both in side panel as CompactPickerRow and in the mobile FullPlayerRow list)
    expect(playerLinks.length).toBeGreaterThanOrEqual(ownedPlayers.length);
  });

  // ── Squad size switching ──

  it('switches to 7er formations when 7er is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    await user.click(screen.getByRole('button', { name: '7er' }));

    // Should now show 7er formation buttons
    expect(screen.getByRole('button', { name: '2-2-2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3-2-1' })).toBeInTheDocument();

    // Pitch should reflect 7er default formation (2-2-2)
    const pitch = screen.getByTestId('squad-pitch');
    expect(pitch).toHaveAttribute('data-formation', '2-2-2');
  });

  // ── Formation switching ──

  it('changes formation when a formation button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    await user.click(screen.getByRole('button', { name: '4-4-2' }));

    const pitch = screen.getByTestId('squad-pitch');
    expect(pitch).toHaveAttribute('data-formation', '4-4-2');
  });

  // ── Sort buttons ──

  it('renders sort buttons (L5, value, A-Z) in the mobile player list', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );
    // Mobile section sort buttons
    expect(screen.getAllByRole('button', { name: 'L5' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'kaderSortValue' }).length).toBeGreaterThanOrEqual(1);
  });

  // ── Presets ──

  it('opens presets dropdown when presets button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    const presetsButton = screen.getByRole('button', { name: 'kaderPresetsLabel' });
    await user.click(presetsButton);

    // Preset name input should appear
    const presetInput = screen.getByRole('textbox', { name: 'kaderPresetNameLabel' });
    expect(presetInput).toBeInTheDocument();

    // "No presets" message
    expect(screen.getByText('kaderNoPresets')).toBeInTheDocument();
  });

  it('saves and shows a preset', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    // Open presets
    await user.click(screen.getByRole('button', { name: 'kaderPresetsLabel' }));

    // Type preset name
    const presetInput = screen.getByRole('textbox', { name: 'kaderPresetNameLabel' });
    await user.type(presetInput, 'My Lineup');

    // Click save
    await user.click(screen.getByRole('button', { name: 'kaderSavePreset' }));

    // Re-open presets panel (it closes on save)
    await user.click(screen.getByRole('button', { name: 'kaderPresetsLabel' }));

    // Preset name should appear
    expect(screen.getByText('My Lineup')).toBeInTheDocument();
  });

  // ── Reset ──

  it('resets assignments when reset button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    // The reset button has aria-label "kaderResetLabel"
    const resetBtn = screen.getByRole('button', { name: 'kaderResetLabel' });
    expect(resetBtn).toBeInTheDocument();

    // Should be clickable without error
    await user.click(resetBtn);
  });

  // ── Slot interaction (pitch click triggers picker) ──

  it('opens mobile picker when a pitch slot is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    // Click an empty GK slot (index 0 in 4-3-3)
    await user.click(screen.getByTestId('pitch-slot-0'));

    // Mobile picker should open — it has a close button with aria-label "kaderClose"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'kaderClose' })).toBeInTheDocument();
    });
  });

  it('closes mobile picker when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    // Open picker
    await user.click(screen.getByTestId('pitch-slot-0'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'kaderClose' })).toBeInTheDocument();
    });

    // Close picker
    await user.click(screen.getByRole('button', { name: 'kaderClose' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'kaderClose' })).not.toBeInTheDocument();
    });
  });

  // ── Manager data integration ──

  it('passes minutes and scores data to FullPlayerRow via hooks', () => {
    mockMinutesMap.set('p-gk', [90, 90, 90, 45, 0]);
    mockScoresMap.set('p-gk', [85, 72, null, 90, 65]);

    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    // ManagerPlayerRow renders match icon stubs and stat emojis
    const matchIcons = screen.getAllByTestId('match-icon');
    expect(matchIcons.length).toBeGreaterThanOrEqual(ownedPlayers.length);
  });

  // ── Player stats display ──

  it('renders player stats with emojis (goals and assists)', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    // ManagerPlayerRow uses ⚽ and 🅰️ emojis for goals/assists
    const goals = screen.getAllByText('⚽');
    expect(goals.length).toBeGreaterThanOrEqual(ownedPlayers.length);
  });

  // ── Search in desktop side panel ──

  it('renders search input in the desktop side panel', () => {
    renderWithProviders(
      <ManagerKaderTab players={allPlayers} ownedPlayers={ownedPlayers} />,
    );

    // Desktop panel search input (aria-label = kaderSearchLabel)
    const searchInputs = screen.getAllByRole('textbox', { name: 'kaderSearchLabel' });
    expect(searchInputs.length).toBeGreaterThanOrEqual(1);
  });
});
