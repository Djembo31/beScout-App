import { describe, it, expect } from 'vitest';
import '@/test/mocks/supabase'; // Must be imported before any service that uses supabaseClient
import { isValidHandle, isReservedHandle, validateHandle, RESERVED_HANDLES } from '../profiles';

// ============================================
// isValidHandle
// ============================================

describe('isValidHandle', () => {
  // --- Valid handles ---

  it('accepts lowercase 3-char handle', () => {
    expect(isValidHandle('abc')).toBe(true);
  });

  it('accepts handle with underscore', () => {
    expect(isValidHandle('test_123')).toBe(true);
  });

  it('accepts handle with digits', () => {
    expect(isValidHandle('a0b')).toBe(true);
  });

  it('accepts 20-char handle (max length)', () => {
    expect(isValidHandle('a'.repeat(20))).toBe(true);
  });

  it('accepts all-digit handle', () => {
    expect(isValidHandle('123')).toBe(true);
  });

  it('accepts handle starting with underscore', () => {
    expect(isValidHandle('_abc')).toBe(true);
  });

  // --- Invalid handles ---

  it('rejects 2-char handle (too short)', () => {
    expect(isValidHandle('ab')).toBe(false);
  });

  it('rejects uppercase letters', () => {
    expect(isValidHandle('ABC')).toBe(false);
  });

  it('rejects handle with hyphen', () => {
    expect(isValidHandle('test-name')).toBe(false);
  });

  it('rejects 21-char handle (too long)', () => {
    expect(isValidHandle('a'.repeat(21))).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidHandle('')).toBe(false);
  });

  it('rejects handle with spaces', () => {
    expect(isValidHandle('test name')).toBe(false);
  });

  it('rejects handle with special characters', () => {
    expect(isValidHandle('test@name')).toBe(false);
  });

  it('rejects mixed case', () => {
    expect(isValidHandle('testName')).toBe(false);
  });

  it('rejects handle with dots', () => {
    expect(isValidHandle('test.name')).toBe(false);
  });
});

// ============================================
// isReservedHandle
// ============================================

describe('isReservedHandle', () => {
  it('blocks "admin"', () => {
    expect(isReservedHandle('admin')).toBe(true);
  });

  it('blocks "bescout"', () => {
    expect(isReservedHandle('bescout')).toBe(true);
  });

  it('blocks "support"', () => {
    expect(isReservedHandle('support')).toBe(true);
  });

  it('blocks "root"', () => {
    expect(isReservedHandle('root')).toBe(true);
  });

  it('blocks "anil"', () => {
    expect(isReservedHandle('anil')).toBe(true);
  });

  it('blocks "team"', () => {
    expect(isReservedHandle('team')).toBe(true);
  });

  it('blocks "founder"', () => {
    expect(isReservedHandle('founder')).toBe(true);
  });

  it('blocks "jarvis"', () => {
    expect(isReservedHandle('jarvis')).toBe(true);
  });

  it('blocks "official"', () => {
    expect(isReservedHandle('official')).toBe(true);
  });

  it('blocks "mod" and "moderator"', () => {
    expect(isReservedHandle('mod')).toBe(true);
    expect(isReservedHandle('moderator')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isReservedHandle('ADMIN')).toBe(true);
    expect(isReservedHandle('BeScout')).toBe(true);
  });

  it('allows normal handles', () => {
    expect(isReservedHandle('kemal')).toBe(false);
    expect(isReservedHandle('fan_123')).toBe(false);
  });

  it('RESERVED_HANDLES is non-empty', () => {
    expect(RESERVED_HANDLES.length).toBeGreaterThan(0);
  });
});

// ============================================
// validateHandle
// ============================================

describe('validateHandle', () => {
  it('returns null for a valid, non-reserved handle', () => {
    expect(validateHandle('kemal_d')).toBeNull();
  });

  it('returns handleInvalid for malformed handle', () => {
    expect(validateHandle('AB')).toBe('handleInvalid');
    expect(validateHandle('bad handle')).toBe('handleInvalid');
  });

  it('returns handleReserved for blocklisted handle (even if regex-valid)', () => {
    expect(validateHandle('admin')).toBe('handleReserved');
    expect(validateHandle('bescout')).toBe('handleReserved');
  });

  it('prioritises regex over reserved check', () => {
    // "AD" is too short → handleInvalid, not handleReserved
    expect(validateHandle('AD')).toBe('handleInvalid');
  });
});
