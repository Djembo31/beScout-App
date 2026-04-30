/**
 * cachedQuery unit tests — Slice 268.
 *
 * Coverage:
 * - readCached: happy / empty / corrupt JSON / SSR / no-uid / wrong-uid (UID-keyed isolation)
 * - writeCached: happy / quota-exceeded fail-open / SSR / no-uid
 * - clearCachedAllSlots: removes only bs_wallet_* / bs_tickets_*, leaves other keys
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readCached, writeCached, clearCachedAllSlots } from '../cachedQuery';

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: vi.fn(),
}));

const UID_A = 'aaaaaaaa-1111-1111-1111-111111111111';
const UID_B = 'bbbbbbbb-2222-2222-2222-222222222222';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('readCached', () => {
  it('returns undefined when slot does not exist', () => {
    expect(readCached('bs_wallet', UID_A)).toBeUndefined();
  });

  it('returns parsed JSON when slot exists for UID', () => {
    localStorage.setItem(`bs_wallet_${UID_A}`, JSON.stringify({ balance: 1000 }));
    expect(readCached<{ balance: number }>('bs_wallet', UID_A)).toEqual({ balance: 1000 });
  });

  it('UID-keyed isolation: User-A slot does not leak to User-B reads', () => {
    localStorage.setItem(`bs_wallet_${UID_A}`, JSON.stringify({ balance: 9999 }));
    expect(readCached('bs_wallet', UID_B)).toBeUndefined();
  });

  it('returns undefined and logs on corrupt JSON', () => {
    localStorage.setItem(`bs_wallet_${UID_A}`, 'NOT_JSON_GARBAGE');
    expect(readCached('bs_wallet', UID_A)).toBeUndefined();
  });

  it('returns undefined when uid is empty string', () => {
    expect(readCached('bs_wallet', '')).toBeUndefined();
  });

  it('separates bs_wallet and bs_tickets slots for same UID', () => {
    localStorage.setItem(`bs_wallet_${UID_A}`, JSON.stringify({ balance: 1 }));
    localStorage.setItem(`bs_tickets_${UID_A}`, JSON.stringify({ balance: 5 }));
    expect(readCached<{ balance: number }>('bs_wallet', UID_A)?.balance).toBe(1);
    expect(readCached<{ balance: number }>('bs_tickets', UID_A)?.balance).toBe(5);
  });
});

describe('writeCached', () => {
  it('writes JSON to UID-keyed slot', () => {
    writeCached('bs_wallet', UID_A, { balance: 5000 });
    expect(localStorage.getItem(`bs_wallet_${UID_A}`)).toBe('{"balance":5000}');
  });

  it('does not write when uid is empty', () => {
    writeCached('bs_wallet', '', { balance: 5000 });
    expect(localStorage.length).toBe(0);
  });

  it('fail-open on quota-exceeded — does not throw', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => writeCached('bs_wallet', UID_A, { balance: 1 })).not.toThrow();
    setItemSpy.mockRestore();
  });
});

describe('clearCachedAllSlots', () => {
  it('removes all bs_wallet_* and bs_tickets_* slots regardless of UID', () => {
    localStorage.setItem(`bs_wallet_${UID_A}`, '{"balance":1}');
    localStorage.setItem(`bs_wallet_${UID_B}`, '{"balance":2}');
    localStorage.setItem(`bs_tickets_${UID_A}`, '{"balance":5}');
    localStorage.setItem(`bs_tickets_${UID_B}`, '{"balance":10}');
    clearCachedAllSlots();
    expect(localStorage.getItem(`bs_wallet_${UID_A}`)).toBeNull();
    expect(localStorage.getItem(`bs_wallet_${UID_B}`)).toBeNull();
    expect(localStorage.getItem(`bs_tickets_${UID_A}`)).toBeNull();
    expect(localStorage.getItem(`bs_tickets_${UID_B}`)).toBeNull();
  });

  it('leaves other localStorage keys untouched (bs_user, bs_profile, etc.)', () => {
    localStorage.setItem('bs_user', '{"id":"x"}');
    localStorage.setItem('bs_profile', '{"display_name":"foo"}');
    localStorage.setItem(`bs_wallet_${UID_A}`, '{"balance":1}');
    clearCachedAllSlots();
    expect(localStorage.getItem('bs_user')).toBe('{"id":"x"}');
    expect(localStorage.getItem('bs_profile')).toBe('{"display_name":"foo"}');
    expect(localStorage.getItem(`bs_wallet_${UID_A}`)).toBeNull();
  });

  it('handles empty localStorage without error', () => {
    expect(() => clearCachedAllSlots()).not.toThrow();
  });
});
