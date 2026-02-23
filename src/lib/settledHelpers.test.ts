import { describe, it, expect } from 'vitest';
import { val } from './settledHelpers';

describe('val', () => {
  it('returns value for fulfilled result', () => {
    const result: PromiseSettledResult<number> = { status: 'fulfilled', value: 42 };
    expect(val(result, 0)).toBe(42);
  });

  it('returns fallback for rejected result', () => {
    const result: PromiseSettledResult<number> = { status: 'rejected', reason: new Error('fail') };
    expect(val(result, -1)).toBe(-1);
  });

  it('works with string type', () => {
    const ok: PromiseSettledResult<string> = { status: 'fulfilled', value: 'hello' };
    expect(val(ok, 'default')).toBe('hello');

    const fail: PromiseSettledResult<string> = { status: 'rejected', reason: 'err' };
    expect(val(fail, 'default')).toBe('default');
  });

  it('works with array type', () => {
    const ok: PromiseSettledResult<number[]> = { status: 'fulfilled', value: [1, 2, 3] };
    expect(val(ok, [])).toEqual([1, 2, 3]);

    const fail: PromiseSettledResult<number[]> = { status: 'rejected', reason: 'err' };
    expect(val(fail, [])).toEqual([]);
  });

  it('returns null value when fulfilled with null', () => {
    const result: PromiseSettledResult<null> = { status: 'fulfilled', value: null };
    expect(val(result, null)).toBeNull();
  });

  it('returns fallback (not the reason) on rejection', () => {
    const result: PromiseSettledResult<string> = { status: 'rejected', reason: 'error message' };
    // Should return fallback, not the reason
    expect(val(result, 'fallback')).toBe('fallback');
    expect(val(result, 'fallback')).not.toBe('error message');
  });
});
