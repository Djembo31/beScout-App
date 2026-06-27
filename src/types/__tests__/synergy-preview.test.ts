import { describe, it, expect } from 'vitest';
import { calculateSynergyPreview } from '@/types';

// Slice 424: calculateSynergyPreview MUST mirror score_event (Live-functiondef D87):
// per distinct club_id with >=2 lineup players → +5% (flat), total LEAST 15.
// (Surge ×2 is server-only at settle, not previewed.)

const c = (id: string, name = id) => ({ id, name });

describe('calculateSynergyPreview — server parity (Slice 424)', () => {
  it('AC-1: 3 players same club → +5% (flat, NOT 10%) + count ×3', () => {
    const r = calculateSynergyPreview([c('bay'), c('bay'), c('bay')]);
    expect(r.totalPct).toBe(5);
    expect(r.details).toHaveLength(1);
    expect(r.details[0].bonus_pct).toBe(5);
    expect(r.details[0].count).toBe(3);
  });

  it('AC-2: two clubs with 2 each → +10%, je ×2', () => {
    const r = calculateSynergyPreview([c('bay'), c('bay'), c('dor'), c('dor')]);
    expect(r.totalPct).toBe(10);
    expect(r.details.map(d => d.count).sort()).toEqual([2, 2]);
  });

  it('AC-3: four clubs with 2 each → capped at 15% (not 20)', () => {
    const r = calculateSynergyPreview([
      c('a'), c('a'), c('b'), c('b'), c('d'), c('d'), c('e'), c('e'),
    ]);
    expect(r.totalPct).toBe(15);
  });

  it('AC-4: grouped by club_id — same id, different (stale) names = ONE club ×2', () => {
    const r = calculateSynergyPreview([
      { id: 'konya-uuid', name: 'Konyaspor' },
      { id: 'konya-uuid', name: 'Sakaryaspor' }, // stale players.club string
    ]);
    expect(r.totalPct).toBe(5);
    expect(r.details).toHaveLength(1);
    expect(r.details[0].count).toBe(2);
    expect(r.details[0].source).toBe('Konyaspor'); // first-seen resolved name
  });

  it('1 player per club → no synergy', () => {
    expect(calculateSynergyPreview([c('a'), c('b'), c('d')]).totalPct).toBe(0);
  });

  it('null/empty id skipped (clubId-Fallback edge)', () => {
    const r = calculateSynergyPreview([{ id: '', name: 'X' }, { id: '', name: 'Y' }]);
    expect(r.totalPct).toBe(0);
  });
});
