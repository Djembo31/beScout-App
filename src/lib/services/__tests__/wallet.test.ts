import { describe, it, expect } from 'vitest';
import '@/test/mocks/supabase'; // Must be imported before any service that uses supabaseClient
import { formatScout } from '../wallet';

// ============================================
// formatScout
// ============================================

describe('formatScout', () => {
  it('formats large cent value (1000000 -> "10.000")', () => {
    // 1,000,000 cents = 10,000 bCredits. German locale: 10.000
    const result = formatScout(1_000_000);
    expect(result).toBe('10.000');
  });

  it('formats small fractional cent value exactly (50 -> "0,5")', () => {
    // Slice 467/D-23: 50 cents = 0,5 Credits → 2-Dez (kanonischer fmtScout), nicht mehr gerundet.
    const result = formatScout(50);
    expect(result).toBe('0,5');
  });

  it('formats zero', () => {
    expect(formatScout(0)).toBe('0');
  });

  it('formats exact bCredits value (10000 -> "100")', () => {
    // 10,000 cents = 100 bCredits
    expect(formatScout(10_000)).toBe('100');
  });

  it('formats 100 cents as "1"', () => {
    expect(formatScout(100)).toBe('1');
  });

  it('formats 500000 cents as "5.000"', () => {
    expect(formatScout(500_000)).toBe('5.000');
  });
});
