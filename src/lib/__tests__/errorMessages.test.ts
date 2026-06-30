import { describe, it, expect } from 'vitest';
import { mapErrorToKey } from '../errorMessages';

// Slice 479 (D-25): Auth-Fehler-i18n — GoTrue-Englisch-Strings → vorhandene errors-NS-Keys.
describe('mapErrorToKey — Auth/GoTrue patterns (Slice 479 / D-25)', () => {
  it('maps "User already registered" → alreadyExists', () => {
    expect(mapErrorToKey('User already registered')).toBe('alreadyExists');
  });

  it('maps GoTrue OTP cooldown → rateLimited', () => {
    expect(mapErrorToKey('For security purposes, you can only request this after 60 seconds')).toBe('rateLimited');
    expect(mapErrorToKey('Email rate limit exceeded')).toBe('rateLimited');
  });

  it('keeps known keys pass-through', () => {
    expect(mapErrorToKey('rateLimited')).toBe('rateLimited');
    expect(mapErrorToKey('alreadyExists')).toBe('alreadyExists');
  });

  it('falls back to generic for unknown GoTrue strings (translated, not raw English)', () => {
    // e.g. "Email not confirmed" / "Signups not allowed" have no specific key yet (→ optional TR-Review enhancement)
    expect(mapErrorToKey('Some unmapped GoTrue auth error xyz')).toBe('generic');
  });
});
