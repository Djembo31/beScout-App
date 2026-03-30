import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================
// Mocks
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mocks
const mockUseRecentMinutes = vi.fn();
const mockUseRecentScores = vi.fn();
const mockUseNextFixtures = vi.fn();
const mockUsePlayerEventUsage = vi.fn();

vi.mock('@/lib/queries/managerData', () => ({
  useRecentMinutes: (...a: any[]) => mockUseRecentMinutes(...a),
  useRecentScores: (...a: any[]) => mockUseRecentScores(...a),
  useNextFixtures: (...a: any[]) => mockUseNextFixtures(...a),
  usePlayerEventUsage: (...a: any[]) => mockUsePlayerEventUsage(...a),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({ user: { id: 'u1' } }),
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useKaderState } from '../useKaderState';
import type { Player } from '@/types';

// ============================================
// Fixtures
// ============================================

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    first: 'Hakan',
    last: 'Arslan',
    pos: 'MID',
    club: 'Sakaryaspor',
    clubId: 'club-1',
    perf: { l5: 75, l15: 70, l5Apps: 5, l15Apps: 12, season: 72, trend: 'UP' as const },
    prices: { floor: 5, lastTrade: 5, change24h: 0 },
    stats: { matches: 10, goals: 2, assists: 3 },
    ipo: { status: 'none' },
    status: 'active',
    isLiquidated: false,
    ...overrides,
  } as Player;
}

const PLAYERS = [
  makePlayer({ id: 'p-gk', first: 'GK', last: 'Player', pos: 'GK', perf: { l5: 60, l15: 55, l5Apps: 5, l15Apps: 12, season: 57, trend: 'FLAT' } }),
  makePlayer({ id: 'p-def', first: 'DEF', last: 'Player', pos: 'DEF', perf: { l5: 50, l15: 45, l5Apps: 5, l15Apps: 12, season: 47, trend: 'DOWN' } }),
  makePlayer({ id: 'p-mid1', first: 'MID1', last: 'Arslan', pos: 'MID', perf: { l5: 80, l15: 70, l5Apps: 5, l15Apps: 12, season: 75, trend: 'UP' } }),
  makePlayer({ id: 'p-mid2', first: 'MID2', last: 'Yilmaz', pos: 'MID', perf: { l5: 70, l15: 65, l5Apps: 5, l15Apps: 12, season: 67, trend: 'UP' } }),
  makePlayer({ id: 'p-att', first: 'ATT', last: 'Striker', pos: 'ATT', perf: { l5: 90, l15: 80, l5Apps: 5, l15Apps: 12, season: 85, trend: 'UP' } }),
];

function setDefaults() {
  mockUseRecentMinutes.mockReturnValue({ data: undefined });
  mockUseRecentScores.mockReturnValue({ data: undefined });
  mockUseNextFixtures.mockReturnValue({ data: undefined });
  mockUsePlayerEventUsage.mockReturnValue({ data: undefined });
}

// ============================================
// Tests
// ============================================

describe('useKaderState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaults();
    localStorage.clear();
  });

  const defaultProps = { players: PLAYERS, ownedPlayers: PLAYERS };

  // ── Initial State ──

  it('returns default squad size and formation', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    expect(result.current.squadSize).toBe('11');
    expect(result.current.formation).toBeDefined();
    expect(result.current.assignedPlayers.size).toBe(0);
  });

  // ── Squad Size Change ──

  it('changes squad size and resets assignments', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.handleSquadSizeChange('7'));
    expect(result.current.squadSize).toBe('7');
    expect(result.current.assignedPlayers.size).toBe(0);
  });

  // ── Formation Change ──

  it('changes formation and resets assignments', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    const formations = result.current.availableFormations;
    if (formations.length > 1) {
      act(() => result.current.handleFormationChange(formations[1].id));
      expect(result.current.formationId).toBe(formations[1].id);
    }
  });

  // ── Slot Click + Pick Player ──

  it('opens picker on empty slot click', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.handleSlotClick(0, 'GK'));
    expect(result.current.pickerOpen).toEqual({ slotIndex: 0, pos: 'GK' });
  });

  it('picks a player for a slot', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.handleSlotClick(0, 'GK'));
    act(() => result.current.handlePickPlayer('p-gk'));
    expect(result.current.assignedPlayers.get(0)?.id).toBe('p-gk');
    expect(result.current.pickerOpen).toBeNull();
  });

  it('removes player on occupied slot click', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.handleSlotClick(0, 'GK'));
    act(() => result.current.handlePickPlayer('p-gk'));
    expect(result.current.assignedPlayers.size).toBe(1);
    act(() => result.current.handleSlotClick(0, 'GK'));
    expect(result.current.assignedPlayers.size).toBe(0);
  });

  // ── Picker Players ──

  it('filters picker by position and excludes assigned', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.handleSlotClick(0, 'MID'));
    // Should have 2 MID players
    expect(result.current.pickerPlayers).toHaveLength(2);
    // Pick one
    act(() => result.current.handlePickPlayer('p-mid1'));
    // Open another MID slot
    act(() => result.current.handleSlotClick(1, 'MID'));
    // Should have 1 MID player left
    expect(result.current.pickerPlayers).toHaveLength(1);
    expect(result.current.pickerPlayers[0].id).toBe('p-mid2');
  });

  it('filters picker by search', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.handleSlotClick(0, 'MID'));
    act(() => result.current.setPickerSearch('Arslan'));
    expect(result.current.pickerPlayers).toHaveLength(1);
    expect(result.current.pickerPlayers[0].id).toBe('p-mid1');
  });

  // ── Sorting ──

  it('sorts owned players by perf desc', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    expect(result.current.sortedOwned[0].id).toBe('p-att'); // highest l5=90
  });

  it('sorts owned players by name', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.setSortBy('name'));
    expect(result.current.sortedOwned[0].last).toBe('Arslan');
  });

  // ── Presets ──

  it('saves and loads presets', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    // Assign a player
    act(() => result.current.handleSlotClick(0, 'GK'));
    act(() => result.current.handlePickPlayer('p-gk'));
    // Save preset
    act(() => result.current.setPresetName('My Squad'));
    act(() => result.current.handleSavePreset());
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe('My Squad');
    // Reset
    act(() => result.current.handleResetAll());
    expect(result.current.assignedPlayers.size).toBe(0);
    // Load preset
    act(() => result.current.handleLoadPreset(result.current.presets[0]));
    expect(result.current.assignedPlayers.get(0)?.id).toBe('p-gk');
  });

  it('deletes a preset', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.setPresetName('Test'));
    act(() => result.current.handleSavePreset());
    expect(result.current.presets).toHaveLength(1);
    act(() => result.current.handleDeletePreset('Test'));
    expect(result.current.presets).toHaveLength(0);
  });

  // ── Reset ──

  it('resets all state', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.handleSlotClick(0, 'GK'));
    act(() => result.current.handlePickPlayer('p-gk'));
    act(() => result.current.handleResetAll());
    expect(result.current.assignedPlayers.size).toBe(0);
    expect(result.current.sidePanelPos).toBeNull();
    expect(result.current.sidePanelSlot).toBeNull();
  });

  // ── Close Picker ──

  it('closes picker and resets side panel', () => {
    const { result } = renderHook(() => useKaderState(defaultProps));
    act(() => result.current.handleSlotClick(0, 'GK'));
    expect(result.current.pickerOpen).not.toBeNull();
    act(() => result.current.handleClosePicker());
    expect(result.current.pickerOpen).toBeNull();
    expect(result.current.sidePanelPos).toBeNull();
  });

  // ── Event Usage ──

  it('getEventCount returns count from map', () => {
    const usageMap = new Map([['p-mid1', ['ev-1', 'ev-2']]]);
    mockUsePlayerEventUsage.mockReturnValue({ data: usageMap });
    const { result } = renderHook(() => useKaderState(defaultProps));
    expect(result.current.getEventCount('p-mid1')).toBe(2);
    expect(result.current.getEventCount('p-unknown')).toBe(0);
  });

  // ── Next Fixture ──

  it('getNextFixture returns fixture from map', () => {
    const fixtureMap = new Map([['club-1', { opponent: 'Team B', isHome: true }]]);
    mockUseNextFixtures.mockReturnValue({ data: fixtureMap });
    const { result } = renderHook(() => useKaderState(defaultProps));
    expect(result.current.getNextFixture(PLAYERS[0])).toEqual({ opponent: 'Team B', isHome: true });
  });
});
