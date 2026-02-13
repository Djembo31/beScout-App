import { describe, it, expect } from 'vitest';
import { cn, fmtBSD, fmtCompact, fmtPct, clamp, truncate } from './utils';

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
// fmtBSD (German locale number formatting)
// ============================================

describe('fmtBSD', () => {
  it('formats 1000 with German thousands separator', () => {
    const result = fmtBSD(1000);
    expect(result).toBe('1.000');
  });

  it('formats decimal value with up to 2 digits', () => {
    const result = fmtBSD(5.5);
    expect(result).toBe('5,5');
  });

  it('formats zero', () => {
    expect(fmtBSD(0)).toBe('0');
  });

  it('handles undefined', () => {
    expect(fmtBSD(undefined)).toBe('0');
  });

  it('handles null', () => {
    expect(fmtBSD(null)).toBe('0');
  });

  it('formats large number', () => {
    expect(fmtBSD(1000000)).toBe('1.000.000');
  });

  it('formats value with 2 decimal places', () => {
    // maximumFractionDigits: 2
    const result = fmtBSD(99.99);
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
