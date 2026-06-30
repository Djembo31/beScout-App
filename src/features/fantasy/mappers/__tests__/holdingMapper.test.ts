import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbHoldingToUserDpcHolding } from '../holdingMapper';
import type { HoldingWithPlayer } from '@/lib/services/wallet';

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: vi.fn(),
}));
import { logSilentCatch } from '@/lib/observability/silentRejects';

// Slice 478 (D-26b): holdingMapper resolves club name from FK club_id via getClub.
// Default (reset) returns undefined → fallback to freetext (= old empty-cache behavior,
// so the non-D26b tests below are unaffected).
const { mockGetClub } = vi.hoisted(() => ({ mockGetClub: vi.fn() }));
vi.mock('@/lib/clubs', () => ({ getClub: mockGetClub }));

const PLAYER_FULL = {
  first_name: 'Mert',
  last_name: 'Çelik',
  position: 'DEF',
  club: 'Sivasspor',
  club_id: 'def4fe6e-d592-4b4b-88d7-128cde54f968',
  floor_price: 50000,
  price_change_24h: 0,
  perf_l5: 66,
  perf_l15: 60,
  matches: 27,
  goals: 1,
  assists: 0,
  status: 'fit',
  shirt_number: 20,
  age: 28,
  image_url: 'https://media.api-sports.io/football/players/49839.png',
};

describe('dbHoldingToUserDpcHolding (Slice 192 defensive guard)', () => {
  beforeEach(() => {
    vi.mocked(logSilentCatch).mockClear();
    mockGetClub.mockReset();
  });

  // Slice 478 (D-26b): club identity = FK-resolved clubs.name, not stale players.club.
  it('resolves club name from FK club_id, overriding stale freetext (D-26b)', () => {
    mockGetClub.mockReturnValue({ id: 'lev', name: 'Bayer Leverkusen', league: 'Bundesliga' });
    const holding = {
      user_id: 'u1', player_id: 'p1', quantity: 1, created_at: '2026-04-24T00:00:00Z',
      player: { ...PLAYER_FULL, club: 'Bournemouth', club_id: 'lev' },
    } as HoldingWithPlayer;
    expect(dbHoldingToUserDpcHolding(holding).club).toBe('Bayer Leverkusen');
  });

  it('falls back to freetext club when getClub null / club_id null (D-26b)', () => {
    mockGetClub.mockReturnValue(null);
    const holding = {
      user_id: 'u1', player_id: 'p1', quantity: 1, created_at: '2026-04-24T00:00:00Z',
      player: { ...PLAYER_FULL, club: 'Sivasspor', club_id: null },
    } as unknown as HoldingWithPlayer;
    expect(dbHoldingToUserDpcHolding(holding).club).toBe('Sivasspor');
  });

  it('maps full holding row correctly', () => {
    const holding: HoldingWithPlayer = {
      user_id: 'u1',
      player_id: 'p1',
      quantity: 2,
      created_at: '2026-04-24T00:00:00Z',
      player: PLAYER_FULL,
    } as HoldingWithPlayer;

    const result = dbHoldingToUserDpcHolding(holding);

    expect(result.first).toBe('Mert');
    expect(result.last).toBe('Çelik');
    expect(result.pos).toBe('DEF');
    expect(result.ticket).toBe(20);
    expect(result.imageUrl).toBe('https://media.api-sports.io/football/players/49839.png');
    expect(result.dpcOwned).toBe(2);
  });

  it('throws i18n-key "ghost_holding_row" when h.player is null', () => {
    const ghost = {
      user_id: 'u1',
      player_id: 'ghost-id',
      quantity: 1,
      created_at: '2026-04-24T00:00:00Z',
      player: null,
    } as unknown as HoldingWithPlayer;

    expect(() => dbHoldingToUserDpcHolding(ghost)).toThrow('ghost_holding_row');
  });

  it('logs to Sentry via logSilentCatch BEFORE throwing (diagnostic context)', () => {
    const ghost = {
      user_id: 'u1',
      player_id: 'ghost-with-context',
      quantity: 3,
      created_at: '2026-04-24T00:00:00Z',
      player: null,
    } as unknown as HoldingWithPlayer;

    expect(() => dbHoldingToUserDpcHolding(ghost)).toThrow('ghost_holding_row');
    expect(logSilentCatch).toHaveBeenCalledTimes(1);
    expect(logSilentCatch).toHaveBeenCalledWith(
      'holdingMapper.ghostRow',
      expect.any(Error),
      expect.objectContaining({ playerId: 'ghost-with-context', quantity: 3 }),
    );
  });

  it('throws i18n-key when h.player is undefined (defensive coverage)', () => {
    const ghost = {
      user_id: 'u1',
      player_id: 'undef-id',
      quantity: 1,
      created_at: '2026-04-24T00:00:00Z',
      // player intentionally omitted
    } as unknown as HoldingWithPlayer;

    expect(() => dbHoldingToUserDpcHolding(ghost)).toThrow('ghost_holding_row');
  });
});
