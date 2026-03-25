import { describe, it, expect } from 'vitest';
import { getScoreStyle, getScoreHex, getScoreBg, getScoreTextClass } from '../scoreColor';

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
