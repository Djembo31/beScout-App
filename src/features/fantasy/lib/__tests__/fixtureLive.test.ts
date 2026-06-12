import { describe, it, expect } from 'vitest';
import { isFixtureLive } from '../fixtureLive';

const NOW = new Date('2026-06-12T18:00:00Z');

describe('isFixtureLive (Slice 284a Staleness-Guard)', () => {
  it('true für live innerhalb 5h nach Anstoß', () => {
    expect(isFixtureLive('live', '2026-06-12T16:00:00Z', NOW)).toBe(true);
  });

  it('false für stale-live (Anstoß > 5h her) — die 08.05.-Leichen-Klasse', () => {
    expect(isFixtureLive('live', '2026-05-08T18:30:00Z', NOW)).toBe(false);
  });

  it('false für alle Nicht-live-Status', () => {
    for (const st of ['scheduled', 'finished', 'simulated', 'postponed', 'cancelled']) {
      expect(isFixtureLive(st, '2026-06-12T17:00:00Z', NOW)).toBe(false);
    }
  });

  it('true für live ohne played_at (DB-Status vertrauen)', () => {
    expect(isFixtureLive('live', null, NOW)).toBe(true);
  });

  it('Grenzfall exakt 5h → nicht mehr live', () => {
    expect(isFixtureLive('live', '2026-06-12T13:00:00Z', NOW)).toBe(false);
  });
});
