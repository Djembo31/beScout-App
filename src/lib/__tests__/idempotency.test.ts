import { describe, it, expect } from 'vitest';
import { newIdempotencyKey } from '@/lib/idempotency';

describe('newIdempotencyKey', () => {
  it('returns a non-empty string', () => {
    const key = newIdempotencyKey();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('returns unique keys across calls', () => {
    const keys = new Set(Array.from({ length: 100 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(100);
  });

  it('prefixes namespace when provided', () => {
    const key = newIdempotencyKey('trade.buy');
    expect(key.startsWith('trade.buy:')).toBe(true);
    expect(key.length).toBeGreaterThan('trade.buy:'.length);
  });

  it('omits prefix when no namespace', () => {
    const key = newIdempotencyKey();
    expect(key).not.toContain(':');
  });

  it('namespace keys are still unique', () => {
    const keys = new Set(Array.from({ length: 100 }, () => newIdempotencyKey('ns')));
    expect(keys.size).toBe(100);
  });
});
