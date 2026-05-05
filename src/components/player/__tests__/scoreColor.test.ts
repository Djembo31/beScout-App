import { describe, it, expect } from 'vitest';
import { getScoreStyle, getScoreHex, getScoreBg, getScoreTextClass } from '../scoreColor';
import { fmtPerfL5, getL5ColorWithMatches, getL5HexWithMatches } from '../index';

describe('fmtPerfL5 (Slice 271 Track B1)', () => {
  it('returns em-dash when matches=0 (avoids DB-default 50.00 visual bug)', () => {
    expect(fmtPerfL5(50, 0)).toBe('—');
    expect(fmtPerfL5(75, 0)).toBe('—');
    expect(fmtPerfL5(0, 0)).toBe('—');
  });
  it('returns rounded l5 when matches>0', () => {
    expect(fmtPerfL5(75.4, 5)).toBe('75');
    expect(fmtPerfL5(75.6, 5)).toBe('76');
    expect(fmtPerfL5(50, 1)).toBe('50');
  });
  it('returns 0 when matches=1 and l5=0 (legitimate edge case)', () => {
    expect(fmtPerfL5(0, 1)).toBe('0');
  });
});

describe('getL5ColorWithMatches (Slice 271 Track B1)', () => {
  it('returns neutral text-white/40 when matches=0', () => {
    expect(getL5ColorWithMatches(50, 0)).toBe('text-white/40');
    expect(getL5ColorWithMatches(75, 0)).toBe('text-white/40');
  });
  it('returns score-based color when matches>0', () => {
    expect(getL5ColorWithMatches(75, 5)).toBe(getScoreStyle(75).text);
    expect(getL5ColorWithMatches(50, 1)).toBe(getScoreStyle(50).text);
  });
});

describe('getL5HexWithMatches (Slice 271 Track B1)', () => {
  it('returns neutral-zinc hex when matches=0', () => {
    expect(getL5HexWithMatches(50, 0)).toBe('#71717a');
  });
  it('returns score-based hex when matches>0', () => {
    expect(getL5HexWithMatches(75, 5)).toBe(getScoreStyle(75).hex);
  });
});

describe('getScoreStyle', () => {
  it('returns elite for 90-100', () => {
    expect(getScoreStyle(95).label).toBe('Elite');
    expect(getScoreStyle(95).hex).toBe('#374DF5');
  });
  it('returns sehr gut for 80-89', () => {
    expect(getScoreStyle(85).label).toBe('Sehr gut');
    expect(getScoreStyle(85).hex).toBe('#00ADC4');
  });
  it('returns gut for 70-79', () => {
    expect(getScoreStyle(72).hex).toBe('#00C424');
  });
  it('returns durchschnitt for 60-69', () => {
    expect(getScoreStyle(65).hex).toBe('#D9AF00');
  });
  it('returns unterdurchschnitt for 45-59', () => {
    expect(getScoreStyle(50).hex).toBe('#ED7E07');
  });
  it('returns schwach for <45', () => {
    expect(getScoreStyle(30).hex).toBe('#DC0C00');
  });
  it('returns neutral for 0/null', () => {
    expect(getScoreStyle(0).hex).toBe('#555555');
    expect(getScoreStyle(0).label).toBe('N/A');
  });
  it('returns gold bonus for >100', () => {
    expect(getScoreStyle(113).hex).toBe('#FFD700');
    expect(getScoreStyle(113).label).toBe('Bonus');
  });
  it('handles null and undefined', () => {
    expect(getScoreStyle(null).label).toBe('N/A');
    expect(getScoreStyle(undefined).label).toBe('N/A');
  });
  it('getScoreHex returns hex string', () => {
    expect(getScoreHex(85)).toBe('#00ADC4');
  });
  it('getScoreBg returns tailwind bg class', () => {
    expect(getScoreBg(85)).toContain('bg-');
  });
  it('getScoreTextClass returns tailwind text class', () => {
    expect(getScoreTextClass(85)).toContain('text-');
  });
  it('boundary: exactly 90 is elite', () => {
    expect(getScoreStyle(90).label).toBe('Elite');
  });
  it('boundary: exactly 45 is unterdurchschnitt', () => {
    expect(getScoreStyle(45).label).toBe('Unterdurchschnitt');
  });
  it('boundary: exactly 100 is bonus', () => {
    expect(getScoreStyle(100).label).toBe('Bonus');
  });
});
