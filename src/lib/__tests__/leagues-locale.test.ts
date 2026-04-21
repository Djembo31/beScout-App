import { describe, it, expect } from 'vitest';
import { getCountryName } from '@/lib/leagues';

// Regression-Guards gegen TR-Locale-Fallback-Drift (Slice 128 / beta-prep Bug 1).
// Siehe memory/beta-tr-locale-findings.md + audit-report.md aus synthetic-run 2026-04-21.

describe('getCountryName — locale-aware', () => {
  it('returns DE names when locale is undefined (backward compat)', () => {
    expect(getCountryName('DE')).toBe('Deutschland');
    expect(getCountryName('TR')).toBe('Türkei');
    expect(getCountryName('GB')).toBe('England');
  });

  it('returns DE names when locale="de"', () => {
    expect(getCountryName('DE', 'de')).toBe('Deutschland');
    expect(getCountryName('TR', 'de')).toBe('Türkei');
    expect(getCountryName('IT', 'de')).toBe('Italien');
    expect(getCountryName('ES', 'de')).toBe('Spanien');
    expect(getCountryName('FR', 'de')).toBe('Frankreich');
    expect(getCountryName('NL', 'de')).toBe('Niederlande');
    expect(getCountryName('PT', 'de')).toBe('Portugal');
  });

  it('returns TR names when locale="tr"', () => {
    expect(getCountryName('DE', 'tr')).toBe('Almanya');
    expect(getCountryName('TR', 'tr')).toBe('Türkiye');
    expect(getCountryName('GB', 'tr')).toBe('İngiltere');
    expect(getCountryName('IT', 'tr')).toBe('İtalya');
    expect(getCountryName('ES', 'tr')).toBe('İspanya');
    expect(getCountryName('FR', 'tr')).toBe('Fransa');
    expect(getCountryName('NL', 'tr')).toBe('Hollanda');
    expect(getCountryName('PT', 'tr')).toBe('Portekiz');
  });

  it('falls back to ISO code for unknown countries', () => {
    expect(getCountryName('ZZ', 'de')).toBe('ZZ');
    expect(getCountryName('ZZ', 'tr')).toBe('ZZ');
  });

  it('coverage parity: DE and TR map the same 8 country codes', () => {
    const codes = ['DE', 'TR', 'GB', 'IT', 'ES', 'FR', 'NL', 'PT'];
    for (const code of codes) {
      const de = getCountryName(code, 'de');
      const tr = getCountryName(code, 'tr');
      expect(de).not.toBe(code); // DE must not fallback to code
      expect(tr).not.toBe(code); // TR must not fallback to code
      expect(de).not.toBe(tr);   // must differ (prevents typo-copy)
    }
  });
});
