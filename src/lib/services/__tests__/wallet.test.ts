import { describe, it, expect } from 'vitest';
import '@/test/mocks/supabase'; // Must be imported before any service that uses supabaseClient
import { formatBsd } from '../wallet';

// ============================================
// formatBsd
// ============================================

describe('formatBsd', () => {
  it('formats large cent value (1000000 -> "10.000")', () => {
    // 1,000,000 cents = 10,000 BSD. German locale: 10.000
    const result = formatBsd(1_000_000);
    expect(result).toBe('10.000');
  });

  it('formats small cent value (50 -> "0" or "1")', () => {
    // 50 cents = 0.5 BSD. maximumFractionDigits: 0, so rounds to "1" or "0"
    const result = formatBsd(50);
    // 0.5 rounds to 1 in de-DE with maxFractionDigits:0 (round-half-to-even)
    expect(['0', '1']).toContain(result);
  });

  it('formats zero', () => {
    expect(formatBsd(0)).toBe('0');
  });

  it('formats exact BSD value (10000 -> "100")', () => {
    // 10,000 cents = 100 BSD
    expect(formatBsd(10_000)).toBe('100');
  });

  it('formats 100 cents as "1"', () => {
    expect(formatBsd(100)).toBe('1');
  });

  it('formats 500000 cents as "5.000"', () => {
    expect(formatBsd(500_000)).toBe('5.000');
  });
});
