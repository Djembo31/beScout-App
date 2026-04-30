/**
 * Slice 268 — AuthProvider Cross-User-Pollution-Schutz Tests.
 *
 * Spec: worklog/specs/268-cold-start-cache-mirror.md
 * Reviewer-Find: worklog/reviews/268-review.md Finding #1 (CONCERN-Heal)
 *
 * Testet AC-03 (User-Switch) + AC-04 (SIGNED_OUT-Clear-Sync) — die beiden
 * höchst-Risk-ACs für Cross-User-Pollution. Slice 265 wurde u.a. wegen
 * fehlendem User-Switch-Schutz revertet — diese Tests verhindern Regression.
 *
 * Strategie:
 * - supabase.auth.onAuthStateChange wird gemockt → capturen den Callback
 * - lsClear, clearCachedAllSlots, queryClient.clear werden als Spies gemockt
 * - Render AuthProvider → trigger captured callback mit User-A→User-B-Switch
 * - Verify: invocationCallOrder von clearCachedAllSlots VOR setUser-Trigger,
 *   und SYNCHRON neben lsClear (NICHT im setTimeout)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import type { Session, User } from '@supabase/supabase-js';

// ============================================
// Hoisted mocks (vi.hoisted Pattern — testing.md Slice 170)
// ============================================
const { authStateChangeCb, mockUnsubscribe, mockClearCachedAllSlots, mockQueryClientClear } = vi.hoisted(() => ({
  authStateChangeCb: { current: null as null | ((event: string, session: Session | null) => Promise<void> | void) },
  mockUnsubscribe: vi.fn(),
  mockClearCachedAllSlots: vi.fn(),
  mockQueryClientClear: vi.fn(),
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string, session: Session | null) => Promise<void> | void) => {
        authStateChangeCb.current = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
  },
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { clear: mockQueryClientClear, invalidateQueries: vi.fn() },
}));

vi.mock('@/lib/utils/cachedQuery', () => ({
  clearCachedAllSlots: mockClearCachedAllSlots,
}));

vi.mock('@/lib/services/auth-state', () => ({
  getAuthState: vi.fn(() => Promise.resolve({ profile: null, platformRole: null, clubAdmin: null })),
}));

vi.mock('@/lib/services/profiles', () => ({ getProfile: vi.fn(() => Promise.resolve(null)) }));
vi.mock('@/lib/services/platformAdmin', () => ({ getPlatformAdminRole: vi.fn(() => Promise.resolve(null)) }));
vi.mock('@/lib/services/club', () => ({ getClubAdminFor: vi.fn(() => Promise.resolve(null)) }));
vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn(), flushActivityLogs: vi.fn() }));
vi.mock('@sentry/nextjs', () => ({ setUser: vi.fn(), addBreadcrumb: vi.fn(), captureException: vi.fn() }));
vi.mock('@/lib/observability/silentRejects', () => ({ logSilentRejects: vi.fn(), logSilentCatch: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

import { AuthProvider } from '../AuthProvider';

// ============================================
// Fixtures
// ============================================
const UID_A = 'aaaaaaaa-1111-1111-1111-111111111111';
const UID_B = 'bbbbbbbb-2222-2222-2222-222222222222';

function makeUser(id: string): User {
  return { id, email: `${id}@x.com`, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } as User;
}
function makeSession(user: User): Session {
  return { user, access_token: 't', refresh_token: 'r', token_type: 'bearer', expires_in: 3600 } as Session;
}

// ============================================
// Setup
// ============================================
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  authStateChangeCb.current = null;
});

// ============================================
// AC-03 — User-Switch (User-A → User-B)
// ============================================
describe('AuthProvider Slice 268 — AC-03 User-Switch-Detect-Block', () => {
  it('clearCachedAllSlots wird aufgerufen wenn cachedUserId !== session.user.id', async () => {
    // Pre-condition: User-A in localStorage cached
    localStorage.setItem('bs_user', JSON.stringify(makeUser(UID_A)));
    localStorage.setItem(`bs_wallet_${UID_A}`, JSON.stringify({ balance: 99_000 }));

    render(<AuthProvider><div /></AuthProvider>);

    await waitFor(() => expect(authStateChangeCb.current).not.toBeNull());

    // Trigger SIGNED_IN with User-B (different from cached User-A)
    await authStateChangeCb.current!('SIGNED_IN', makeSession(makeUser(UID_B)));

    expect(mockClearCachedAllSlots).toHaveBeenCalledTimes(1);
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
  });

  it('clearCachedAllSlots wird NICHT aufgerufen wenn cachedUserId === session.user.id', async () => {
    localStorage.setItem('bs_user', JSON.stringify(makeUser(UID_A)));
    render(<AuthProvider><div /></AuthProvider>);

    await waitFor(() => expect(authStateChangeCb.current).not.toBeNull());
    await authStateChangeCb.current!('SIGNED_IN', makeSession(makeUser(UID_A)));

    expect(mockClearCachedAllSlots).not.toHaveBeenCalled();
  });

  it('clearCachedAllSlots wird aufgerufen VOR queryClient.clear (call-order)', async () => {
    localStorage.setItem('bs_user', JSON.stringify(makeUser(UID_A)));
    render(<AuthProvider><div /></AuthProvider>);

    await waitFor(() => expect(authStateChangeCb.current).not.toBeNull());
    await authStateChangeCb.current!('SIGNED_IN', makeSession(makeUser(UID_B)));

    const clearCachedOrder = mockClearCachedAllSlots.mock.invocationCallOrder[0];
    const queryClearOrder = mockQueryClientClear.mock.invocationCallOrder[0];
    expect(clearCachedOrder).toBeLessThan(queryClearOrder);
  });
});

// ============================================
// AC-04 — SIGNED_OUT clearCachedAllSlots SYNCHRON neben lsClear
// ============================================
describe('AuthProvider Slice 268 — AC-04 SIGNED_OUT-Clear-Sync', () => {
  it('clearCachedAllSlots wird beim SIGNED_OUT aufgerufen', async () => {
    localStorage.setItem('bs_user', JSON.stringify(makeUser(UID_A)));
    render(<AuthProvider><div /></AuthProvider>);

    await waitFor(() => expect(authStateChangeCb.current).not.toBeNull());
    // First SIGNED_IN to establish currentUserId
    await authStateChangeCb.current!('SIGNED_IN', makeSession(makeUser(UID_A)));
    mockClearCachedAllSlots.mockClear();

    await authStateChangeCb.current!('SIGNED_OUT', null);

    expect(mockClearCachedAllSlots).toHaveBeenCalledTimes(1);
  });

  it('clearCachedAllSlots läuft SYNCHRON (NICHT im setTimeout) — vor queryClient.clear', async () => {
    // Verify: clearCachedAllSlots' invocationCallOrder ist KLEINER als queryClient.clear
    // weil queryClient.clear im setTimeout(0) liegt → synchron-microtask-after.
    localStorage.setItem('bs_user', JSON.stringify(makeUser(UID_A)));
    vi.useFakeTimers();
    render(<AuthProvider><div /></AuthProvider>);

    // waitFor with fakeTimers needs advancing
    await vi.waitFor(() => expect(authStateChangeCb.current).not.toBeNull());
    await authStateChangeCb.current!('SIGNED_IN', makeSession(makeUser(UID_A)));
    mockClearCachedAllSlots.mockClear();
    mockQueryClientClear.mockClear();

    await authStateChangeCb.current!('SIGNED_OUT', null);

    // clearCachedAllSlots MUSS sofort gelaufen sein (synchron)
    expect(mockClearCachedAllSlots).toHaveBeenCalledTimes(1);
    // queryClient.clear hängt in setTimeout(0) → noch nicht aufgerufen
    expect(mockQueryClientClear).not.toHaveBeenCalled();

    // Nach Timer-Tick läuft queryClient.clear
    vi.advanceTimersByTime(1);
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
