import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cached, invalidate, invalidateAll } from '../cache';

// ============================================
// Cache Tests
// ============================================

describe('cached', () => {
  beforeEach(() => {
    // Clear all cached data between tests
    invalidateAll();
  });

  it('returns data from fetch function on first call', async () => {
    const fn = vi.fn().mockResolvedValue('hello');
    const result = await cached('test:1', fn, 60_000);

    expect(result).toBe('hello');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns cached value on second call within TTL', async () => {
    const fn = vi.fn().mockResolvedValue('cached-value');

    const first = await cached('test:2', fn, 60_000);
    const second = await cached('test:2', fn, 60_000);

    expect(first).toBe('cached-value');
    expect(second).toBe('cached-value');
    expect(fn).toHaveBeenCalledTimes(1); // Only called once
  });

  it('re-fetches after TTL expires', async () => {
    vi.useFakeTimers();

    const fn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    const first = await cached('test:3', fn, 100); // 100ms TTL
    expect(first).toBe('first');
    expect(fn).toHaveBeenCalledTimes(1);

    // Advance past TTL
    vi.advanceTimersByTime(200);

    const second = await cached('test:3', fn, 100);
    expect(second).toBe('second');
    expect(fn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('deduplicates concurrent requests for the same key', async () => {
    let resolvePromise: (val: string) => void;
    const slowFn = vi.fn().mockReturnValue(
      new Promise<string>((resolve) => { resolvePromise = resolve; })
    );

    // Fire two requests for the same key concurrently
    const p1 = cached('test:dedup', slowFn, 60_000);
    const p2 = cached('test:dedup', slowFn, 60_000);

    // Resolve the single inflight request
    resolvePromise!('deduped');

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('deduped');
    expect(r2).toBe('deduped');
    expect(slowFn).toHaveBeenCalledTimes(1); // Only one fetch
  });
});

// ============================================
// invalidate
// ============================================

describe('invalidate', () => {
  beforeEach(() => {
    invalidateAll();
  });

  it('clears keys matching the prefix', async () => {
    const fn1 = vi.fn().mockResolvedValue('a');
    const fn2 = vi.fn().mockResolvedValue('b');

    await cached('players:all', fn1, 60_000);
    await cached('players:123', fn2, 60_000);

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    // Invalidate all player keys
    invalidate('players:');

    // Next calls should re-fetch
    fn1.mockResolvedValue('a2');
    fn2.mockResolvedValue('b2');

    const a2 = await cached('players:all', fn1, 60_000);
    const b2 = await cached('players:123', fn2, 60_000);

    expect(fn1).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledTimes(2);
    expect(a2).toBe('a2');
    expect(b2).toBe('b2');
  });

  it('does not clear keys that do not match the prefix', async () => {
    const fnPlayers = vi.fn().mockResolvedValue('players');
    const fnWallet = vi.fn().mockResolvedValue('wallet');

    await cached('players:all', fnPlayers, 60_000);
    await cached('wallet:user1', fnWallet, 60_000);

    // Invalidate only players
    invalidate('players:');

    // wallet should still be cached
    await cached('wallet:user1', fnWallet, 60_000);
    expect(fnWallet).toHaveBeenCalledTimes(1); // Not re-fetched

    // players should re-fetch
    await cached('players:all', fnPlayers, 60_000);
    expect(fnPlayers).toHaveBeenCalledTimes(2);
  });
});

// ============================================
// invalidateAll
// ============================================

describe('invalidateAll', () => {
  it('clears entire cache', async () => {
    const fn1 = vi.fn().mockResolvedValue('x');
    const fn2 = vi.fn().mockResolvedValue('y');

    await cached('a:1', fn1, 60_000);
    await cached('b:2', fn2, 60_000);

    invalidateAll();

    fn1.mockResolvedValue('x2');
    fn2.mockResolvedValue('y2');

    const x2 = await cached('a:1', fn1, 60_000);
    const y2 = await cached('b:2', fn2, 60_000);

    expect(fn1).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledTimes(2);
    expect(x2).toBe('x2');
    expect(y2).toBe('y2');
  });
});
