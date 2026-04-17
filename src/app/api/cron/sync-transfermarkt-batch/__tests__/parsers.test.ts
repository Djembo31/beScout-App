import { describe, it, expect } from 'vitest';
import { parseMarketValue, parseContractEnd } from '../route';

describe('parseMarketValue', () => {
  it('parses Mio-Euro with comma decimal', () => {
    const html = `<div class="data-header__box--marketvalue"><a href="#">€ 1,50 Mio.</a></div>`;
    expect(parseMarketValue(html)).toBe(1_500_000);
  });

  it('parses Tsd-Euro', () => {
    const html = `<div class="data-header__box--marketvalue"><a>€ 800 Tsd.</a></div>`;
    expect(parseMarketValue(html)).toBe(800_000);
  });

  it('parses large Mio-Euro', () => {
    const html = `<div class="data-header__box--marketvalue"><a>€ 125,00 Mio.</a></div>`;
    expect(parseMarketValue(html)).toBe(125_000_000);
  });

  it('returns null when no market value in HTML', () => {
    const html = `<html><body>No market value here</body></html>`;
    expect(parseMarketValue(html)).toBeNull();
  });

  it('parses even without data-header div (fallback global)', () => {
    const html = `<span>€ 2,75 Mio.</span>`;
    expect(parseMarketValue(html)).toBe(2_750_000);
  });
});

describe('parseContractEnd', () => {
  it('parses date in DD.MM.YYYY format to ISO', () => {
    const html = `<span>Vertrag bis:</span> <span class="info">30.06.2026</span>`;
    expect(parseContractEnd(html)).toBe('2026-06-30');
  });

  it('parses date with more whitespace/tags between', () => {
    const html = `Vertrag bis: <br/><div>  31.12.2025  </div>`;
    expect(parseContractEnd(html)).toBe('2025-12-31');
  });

  it('returns null when no contract date', () => {
    const html = `<html><body>No contract info</body></html>`;
    expect(parseContractEnd(html)).toBeNull();
  });

  it('returns null when date-like string without Vertrag context', () => {
    const html = `<span>Geburtsdatum: 15.03.1995</span>`;
    expect(parseContractEnd(html)).toBeNull();
  });
});
