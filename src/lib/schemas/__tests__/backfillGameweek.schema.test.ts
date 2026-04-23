import { describe, it, expect } from 'vitest';
import { BackfillGameweekSchema } from '../backfillGameweek.schema';

describe('BackfillGameweekSchema (slice 177)', () => {
  it('accepts single number', () => {
    const r = BackfillGameweekSchema.safeParse({ gameweek: 5 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.gameweeks).toEqual([5]);
  });

  it('coerces numeric string to number', () => {
    const r = BackfillGameweekSchema.safeParse({ gameweek: '12' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.gameweeks).toEqual([12]);
  });

  it('expands range-string "1-5" into array', () => {
    const r = BackfillGameweekSchema.safeParse({ gameweek: '1-5' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.gameweeks).toEqual([1, 2, 3, 4, 5]);
  });

  it('expands full-season "1-38"', () => {
    const r = BackfillGameweekSchema.safeParse({ gameweek: '1-38' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.gameweeks).toHaveLength(38);
  });

  it('rejects gw=0', () => {
    expect(BackfillGameweekSchema.safeParse({ gameweek: 0 }).success).toBe(false);
  });

  it('rejects gw=39', () => {
    expect(BackfillGameweekSchema.safeParse({ gameweek: 39 }).success).toBe(false);
  });

  it('rejects inverted range "5-1"', () => {
    expect(BackfillGameweekSchema.safeParse({ gameweek: '5-1' }).success).toBe(false);
  });

  it('rejects range exceeding bounds "30-40"', () => {
    expect(BackfillGameweekSchema.safeParse({ gameweek: '30-40' }).success).toBe(false);
  });

  it('rejects non-numeric range "a-b"', () => {
    expect(BackfillGameweekSchema.safeParse({ gameweek: 'a-b' }).success).toBe(false);
  });

  it('rejects missing gameweek', () => {
    expect(BackfillGameweekSchema.safeParse({}).success).toBe(false);
  });
});
