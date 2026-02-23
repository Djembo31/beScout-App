import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, fmtScout, fmtCompact, fmtPct, clamp, truncate, humanTimeLeft, timeAgo, withTimeout } from './utils';

// ============================================
// cn (classNames helper)
// ============================================

describe('cn', () => {
  it('merges multiple classnames', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false, 'bar', undefined, null, 'baz')).toBe('foo bar baz');
  });

  it('returns empty string for no truthy values', () => {
    expect(cn(false, undefined, null)).toBe('');
  });

  it('handles single class', () => {
    expect(cn('only')).toBe('only');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });
});

// ============================================
// fmtScout (German locale number formatting)
// ============================================

describe('fmtScout', () => {
  it('formats 1000 with German thousands separator', () => {
    const result = fmtScout(1000);
    expect(result).toBe('1.000');
  });

  it('formats decimal value with up to 2 digits', () => {
    const result = fmtScout(5.5);
    expect(result).toBe('5,5');
  });

  it('formats zero', () => {
    expect(fmtScout(0)).toBe('0');
  });

  it('handles undefined', () => {
    expect(fmtScout(undefined)).toBe('0');
  });

  it('handles null', () => {
    expect(fmtScout(null)).toBe('0');
  });

  it('formats large number', () => {
    expect(fmtScout(1000000)).toBe('1.000.000');
  });

  it('formats value with 2 decimal places', () => {
    // maximumFractionDigits: 2
    const result = fmtScout(99.99);
    expect(result).toBe('99,99');
  });
});

// ============================================
// fmtCompact
// ============================================

describe('fmtCompact', () => {
  it('formats millions', () => {
    expect(fmtCompact(1_500_000)).toBe('1.5M');
  });

  it('formats thousands', () => {
    expect(fmtCompact(2_500)).toBe('2.5K');
  });

  it('formats small numbers with German locale', () => {
    const result = fmtCompact(500);
    expect(result).toBe('500');
  });
});

// ============================================
// fmtPct
// ============================================

describe('fmtPct', () => {
  it('formats positive with plus sign', () => {
    expect(fmtPct(5.23)).toBe('+5.2%');
  });

  it('formats negative without plus sign', () => {
    expect(fmtPct(-3.1)).toBe('-3.1%');
  });

  it('formats zero', () => {
    expect(fmtPct(0)).toBe('0.0%');
  });

  it('omits plus sign when showPlus is false', () => {
    expect(fmtPct(5.23, false)).toBe('5.2%');
  });
});

// ============================================
// clamp
// ============================================

describe('clamp', () => {
  it('clamps below min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('clamps above max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('returns value within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
});

// ============================================
// truncate
// ============================================

describe('truncate', () => {
  it('returns short text unchanged', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });

  it('truncates long text with ellipsis', () => {
    const result = truncate('Hello World', 5);
    expect(result).toContain('…');
    expect(result.length).toBeLessThanOrEqual(6); // 5 chars + ellipsis
  });
});

// ============================================
// humanTimeLeft
// ============================================

describe('humanTimeLeft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0m for past timestamps', () => {
    const past = new Date('2026-02-23T11:00:00Z').getTime();
    expect(humanTimeLeft(past)).toBe('0m');
  });

  it('returns minutes only for < 1 hour', () => {
    const future = Date.now() + 30 * 60_000; // 30 min
    expect(humanTimeLeft(future)).toBe('30m');
  });

  it('returns hours and minutes for < 24 hours', () => {
    const future = Date.now() + 3 * 60 * 60_000 + 15 * 60_000; // 3h 15m
    expect(humanTimeLeft(future)).toBe('3h 15m');
  });

  it('returns days and hours for >= 24 hours', () => {
    const future = Date.now() + 2 * 24 * 60 * 60_000 + 5 * 60 * 60_000; // 2d 5h
    expect(humanTimeLeft(future)).toBe('2d 5h');
  });

  it('returns 0m for exactly now', () => {
    expect(humanTimeLeft(Date.now())).toBe('0m');
  });
});

// ============================================
// timeAgo
// ============================================

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for < 1 minute', () => {
    expect(timeAgo(Date.now() - 30_000)).toBe('just now');
  });

  it('returns minutes format', () => {
    expect(timeAgo(Date.now() - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours format', () => {
    expect(timeAgo(Date.now() - 3 * 60 * 60_000)).toBe('3h ago');
  });

  it('returns days format', () => {
    expect(timeAgo(Date.now() - 2 * 24 * 60 * 60_000)).toBe('2d ago');
  });
});

// ============================================
// withTimeout
// ============================================

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when promise resolves before timeout', async () => {
    const fast = new Promise<string>(resolve => setTimeout(() => resolve('ok'), 100));
    const result = withTimeout(fast, 5000);
    vi.advanceTimersByTime(100);
    await expect(result).resolves.toBe('ok');
  });

  it('rejects with Timeout error when promise takes too long', async () => {
    const slow = new Promise<string>(resolve => setTimeout(() => resolve('late'), 10_000));
    const result = withTimeout(slow, 1000);
    vi.advanceTimersByTime(1000);
    await expect(result).rejects.toThrow('Timeout');
  });

  it('passes through rejection from the original promise', async () => {
    const failing = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('boom')), 100));
    const result = withTimeout(failing, 5000);
    vi.advanceTimersByTime(100);
    await expect(result).rejects.toThrow('boom');
  });

  it('uses default timeout of 8000ms', async () => {
    const slow = new Promise<string>(resolve => setTimeout(() => resolve('late'), 10_000));
    const result = withTimeout(slow);
    vi.advanceTimersByTime(8000);
    await expect(result).rejects.toThrow('Timeout');
  });
});
