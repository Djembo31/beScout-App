import { describe, it, expect } from 'vitest';
import '@/test/mocks/supabase'; // Must be imported before any service that uses supabaseClient
import { isValidHandle } from '../profiles';

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
