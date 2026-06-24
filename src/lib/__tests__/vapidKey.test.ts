import { describe, it, expect } from 'vitest';
import { sanitizeVapidKey } from '@/lib/vapidKey';

// Slice 369: the prod VAPID secret was stored as `"3_…A\n"` (surrounding quotes +
// trailing newline) which made web-push.setVapidDetails throw → /api/push 500.
describe('sanitizeVapidKey', () => {
  it('returns clean keys untouched', () => {
    expect(sanitizeVapidKey('BIsqP4U3ZlMt')).toBe('BIsqP4U3ZlMt');
  });

  it('strips surrounding double quotes', () => {
    expect(sanitizeVapidKey('"BIsqP4U3ZlMt"')).toBe('BIsqP4U3ZlMt');
  });

  it('strips surrounding single quotes', () => {
    expect(sanitizeVapidKey("'3_qXXZI5wN'")).toBe('3_qXXZI5wN');
  });

  it('strips a trailing newline (the exact prod corruption)', () => {
    expect(sanitizeVapidKey('"3_qXXZI5wN\n"')).toBe('3_qXXZI5wN');
  });

  it('strips surrounding whitespace and \\r\\n', () => {
    expect(sanitizeVapidKey('  3_qXXZI5wN\r\n')).toBe('3_qXXZI5wN');
  });

  it('does NOT alter the base64url body (no over-stripping)', () => {
    // base64url uses - and _ ; only WRAPPING quotes/whitespace are removed
    expect(sanitizeVapidKey('A_b-C_d')).toBe('A_b-C_d');
  });

  it('handles empty / null / undefined → empty string', () => {
    expect(sanitizeVapidKey('')).toBe('');
    expect(sanitizeVapidKey(null)).toBe('');
    expect(sanitizeVapidKey(undefined)).toBe('');
  });
});
