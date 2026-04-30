'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { getAuthState } from '@/lib/services/auth-state';
import { getProfile } from '@/lib/services/profiles';
import { getPlatformAdminRole, type PlatformAdminRole } from '@/lib/services/platformAdmin';
import { getClubAdminFor } from '@/lib/services/club';
import * as Sentry from '@sentry/nextjs';
import { withTimeout } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';
import { logSilentRejects } from '@/lib/observability/silentRejects';
import type { Profile, ClubAdminRole } from '@/types';

// ============================================
// LocalStorage helpers
// ============================================
//
// Slice 260 (2026-04-30) — migrated from sessionStorage to localStorage:
// sessionStorage is tab-isolated → returning user opens a new tab and gets
// 1-3s skeleton on first load while auth round-trips. localStorage is
// shared across tabs/windows → returning user with prior session sees
// instant warm-cache render (no skeleton flash).
//
// Cross-user-pollution risk is mitigated by the user-switch-detect block
// in onAuthStateChange below (clears cache if cachedUserId !== session.user.id).
//
// SSR-safety preserved: try/catch handles `typeof window === 'undefined'`
// during server-render, plus the existing rule "never read storage in
// useState initializers — only in useEffect" (line ~133).
const LS_USER = 'bs_user';
const LS_PROFILE = 'bs_profile';
const LS_PLATFORM_ROLE = 'bs_platform_role';
const LS_CLUB_ADMIN = 'bs_club_admin';

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) { console.error('[AuthProvider] lsSet quota exceeded:', err); }
}

function lsClear(): void {
  try {
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_PROFILE);
    localStorage.removeItem(LS_PLATFORM_ROLE);
    localStorage.removeItem(LS_CLUB_ADMIN);
  } catch (err) { console.error('[AuthProvider] lsClear:', err); }
}

// ============================================
// Context
// ============================================

export type ClubAdminInfo = { clubId: string; slug: string; role: ClubAdminRole };

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  platformRole: PlatformAdminRole | null;
  clubAdmin: ClubAdminInfo | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  refreshProfile: async () => {},
  platformRole: null,
  clubAdmin: null,
});

export function useUser() {
  return useContext(AuthContext);
}

/** Convenience hook for role checks */
export function useRoles() {
  const { platformRole, clubAdmin } = useContext(AuthContext);
  return {
    platformRole,
    clubAdmin,
    isPlatformAdmin: platformRole !== null,
    isClubAdmin: clubAdmin !== null,
  };
}

/**
 * Slice 110: discriminated-union helper over the existing AuthContext state.
 *
 * - `'hydrating'` — initial mount, no user yet, loading in progress
 * - `'anonymous'` — loaded, no session (signed-out or expired)
 * - `'authenticated'` — user-object is present (including cache-hydrated cached User
 *   before the Supabase session roundtrip completes — matches current loading:false
 *   semantics the app already relies on)
 *
 * Exists to make consumer intent clearer than juggling `user`/`loading` booleans.
 * Does NOT add new runtime state.
 */
export type AuthState = 'hydrating' | 'anonymous' | 'authenticated';
export function useAuthState(): AuthState {
  const { user, loading } = useContext(AuthContext);
  if (user) return 'authenticated';
  if (loading) return 'hydrating';
  return 'anonymous';
}

/** Extract a display name from Supabase user metadata or email */
export function displayName(user: User | null): string {
  if (!user) return 'User';
  const fullName = user.user_metadata?.full_name;
  if (fullName) return fullName;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

/** Hook that redirects to /onboarding if user has no profile */
export function useRequireProfile() {
  const { profile, loading, profileLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profileLoading && !profile) router.replace('/onboarding');
  }, [loading, profileLoading, profile, router]);

  return { profile, loading: loading || profileLoading };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // IMPORTANT: Never read localStorage in useState initializers — it doesn't
  // exist during SSR, causing a hydration mismatch (server=loading, client=cached).
  // Instead, always start as loading and hydrate from cache in useEffect.
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [platformRole, setPlatformRole] = useState<PlatformAdminRole | null>(null);
  const [clubAdmin, setClubAdmin] = useState<ClubAdminInfo | null>(null);

  const loadProfile = useCallback(async (userId: string, _retry = true, _isRefresh = false) => {
    if (!_isRefresh) setProfileLoading(true);

    const applyAuthState = (authState: { profile: Profile | null; platformRole: PlatformAdminRole | null; clubAdmin: ClubAdminInfo | null }) => {
      setProfile(authState.profile);
      if (authState.profile) {
        lsSet(LS_PROFILE, authState.profile);
        if (typeof document !== 'undefined' && authState.profile.language) {
          document.cookie = `bescout-locale=${authState.profile.language};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
        }
      }

      setPlatformRole(authState.platformRole);
      if (authState.platformRole) lsSet(LS_PLATFORM_ROLE, authState.platformRole); else try { localStorage.removeItem(LS_PLATFORM_ROLE); } catch (err) { console.error('[AuthProvider] removeItem platformRole:', err); }

      setClubAdmin(authState.clubAdmin);
      if (authState.clubAdmin) lsSet(LS_CLUB_ADMIN, authState.clubAdmin); else try { localStorage.removeItem(LS_CLUB_ADMIN); } catch (err) { console.error('[AuthProvider] removeItem clubAdmin:', err); }
    };

    // Try primary RPC
    // Slice 263 (2026-04-30): timeout 3s → 10s. Slice 193's 3s assumed server-
    // time ~150ms but ignored Mobile-Safari iOS Initial-State: post-login the
    // Supabase JS SDK does internal session-restore + connection-pool warmup
    // before the first RPC fires. iPhone Mobile Safari (Sentry: 3rd Tester
    // f3267e0d, iOS 18.7) sees 4-9s real-world before RPC even hits the wire
    // — a 3s timeout makes the cascade fire before the SDK is ready. 10s
    // covers worst-case Mobile-Safari without making real failures hang.
    try {
      const authState = await withTimeout(getAuthState(userId), 10000);
      applyAuthState(authState);
      if (!_isRefresh) setProfileLoading(false);
      return;
    } catch (err) {
      // Expected on dev-server cold-start (webpack warmup) and under prod
      // peak latency. The 3-query fallback below is the designed recovery
      // path, not a failure mode — keep this at warn level to avoid noisy
      // monitoring alarms.
      console.warn('[AuthProvider] loadProfile RPC slow, using 3-query fallback:', err);
    }

    // Fallback: 3 separate queries
    // Slice 263: bumped per-query timeout 8s → 15s for the same Mobile-Safari
    // SDK-warmup reasoning. Fallback fires in parallel via Promise.allSettled,
    // so total wall-clock is dominated by the slowest single query.
    try {
      const results = await Promise.allSettled([
        withTimeout(getProfile(userId), 15000),
        withTimeout(getPlatformAdminRole(userId), 15000),
        withTimeout(getClubAdminFor(userId), 15000),
      ]);
      logSilentRejects('AuthProvider.loadProfile', results);
      const [p, pRole, cAdmin] = results;

      if (p.status === 'fulfilled') {
        setProfile(p.value);
        if (p.value) {
          lsSet(LS_PROFILE, p.value);
          if (typeof document !== 'undefined' && p.value.language) {
            document.cookie = `bescout-locale=${p.value.language};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
          }
        }
      }

      const role = pRole.status === 'fulfilled' ? pRole.value : null;
      setPlatformRole(role);
      if (role) lsSet(LS_PLATFORM_ROLE, role); else try { localStorage.removeItem(LS_PLATFORM_ROLE); } catch (err2) { console.error('[AuthProvider] removeItem platformRole:', err2); }

      const ca = cAdmin.status === 'fulfilled' ? cAdmin.value : null;
      setClubAdmin(ca);
      if (ca) lsSet(LS_CLUB_ADMIN, ca); else try { localStorage.removeItem(LS_CLUB_ADMIN); } catch (err2) { console.error('[AuthProvider] removeItem clubAdmin:', err2); }

      // If profile query succeeded (even returning null = legit no profile), we're done
      if (p.status === 'fulfilled') {
        if (!_isRefresh) setProfileLoading(false);
        return;
      }
    } catch (fallbackErr) {
      console.error('[AuthProvider] loadProfile fallback:', fallbackErr);
    }

    // Both failed — retry once after 2s
    if (_retry) {
      console.warn('[AuthProvider] Profile load failed, retrying in 2s…');
      await new Promise(r => setTimeout(r, 2000));
      await loadProfile(userId, false, _isRefresh);
      return;
    }

    // All attempts exhausted
    console.error('[AuthProvider] Profile load failed after retry');
    if (!_isRefresh) setProfileLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id, true, true);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    // Hydrate from localStorage (client-only) for instant UI.
    // This runs after hydration so no server/client mismatch.
    // Slice 260: localStorage is tab-shared — returning users opening a new
    // tab get the same warm-cache. Cross-user pollution is prevented by the
    // user-switch-detect block below in onAuthStateChange.
    const cachedUser = lsGet<User>(LS_USER);
    const cachedProfile = lsGet<Profile>(LS_PROFILE);
    const cachedPlatformRole = lsGet<PlatformAdminRole>(LS_PLATFORM_ROLE);
    const cachedClubAdmin = lsGet<ClubAdminInfo>(LS_CLUB_ADMIN);
    if (cachedUser && cachedProfile) {
      setUser(cachedUser);
      setProfile(cachedProfile);
      setPlatformRole(cachedPlatformRole);
      setClubAdmin(cachedClubAdmin);
      setLoading(false);
    }

    // Use onAuthStateChange as the SINGLE source of truth for session state.
    // DO NOT also call getSession() — that creates a race condition where
    // INITIAL_SESSION fires with null (expired token) ~2s BEFORE getSession()
    // resolves, causing double queryClient.clear() and .map()-on-undefined crashes.
    let initialDone = false;
    // Capture current user ref for logout activity log (closure would be stale)
    let currentUserId: string | null = cachedUser?.id ?? null;
    // Grace period: when cached data exists but INITIAL_SESSION fires with null
    // (expired token), wait for Supabase to attempt token refresh before clearing.
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    const hadCachedUser = !!cachedUser;

    const clearUserState = (event: string) => {
      // Activity log — logout (before clearing state)
      if (event === 'SIGNED_OUT' && currentUserId) {
        const uid = currentUserId;
        import('@/lib/services/activityLog').then(({ logActivity, flushActivityLogs }) => {
          logActivity(uid, 'logout', 'auth');
          flushActivityLogs();
        }).catch(err => console.error('[AuthProvider] logActivity logout:', err));
      }
      // Slice 096: Sentry user-context clear (GDPR — kein stale user-id in nachfolgenden Events)
      Sentry.setUser(null);
      if (event === 'SIGNED_OUT') {
        Sentry.addBreadcrumb({ category: 'auth', message: 'signed_out', level: 'info' });
      }
      currentUserId = null;
      setUser(null);
      setProfile(null);
      setProfileLoading(false);
      setPlatformRole(null);
      setClubAdmin(null);
      lsClear();

      // Clear on any user-state loss (not just SIGNED_OUT) — prevents stale-cache
      // leak on re-login after silent token expire (Flow-Audit Flow 15).
      setTimeout(() => queryClient.clear(), 0);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;

      // Cancel any pending grace timer — a real event arrived.
      if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }

      if (u) {
        // Slice 260: User-Switch-Detect — localStorage is tab-shared and
        // persistent, so a different user could be cached here from a prior
        // session that didn't fire SIGNED_OUT (tab-crash, force-quit). Before
        // setting the new user, clear stale cache + query-data so we never
        // render User-A's profile with User-B's session.
        const cachedUserId = lsGet<User>(LS_USER)?.id;
        if (cachedUserId && cachedUserId !== u.id) {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'user_switch_detected_cache_cleared',
            level: 'info',
            data: { from: cachedUserId.slice(0, 8), to: u.id.slice(0, 8) },
          });
          lsClear();
          queryClient.clear();
        }

        setUser(u);
        lsSet(LS_USER, u);
        currentUserId = u.id;
        await loadProfile(u.id);
        if (event === 'TOKEN_REFRESHED') {
          // Queries may have fired with expired token during cache-hydrated UI.
          // Invalidate so they refetch with the fresh token.
          // Slice 260 P3#1 polish: skip if User-Switch-Detect already cleared
          // the cache above (clear() + invalidate is redundant on empty cache).
          if (!cachedUserId || cachedUserId === u.id) {
            queryClient.invalidateQueries();
          }
        }
        if (event === 'SIGNED_IN') {
          // Slice 096: Sentry pseudonymous user-context (UUID only, GDPR-safe)
          Sentry.setUser({ id: u.id });
          Sentry.addBreadcrumb({ category: 'auth', message: 'signed_in', level: 'info' });
          import('@/lib/services/activityLog').then(({ logActivity }) => {
            logActivity(u.id, 'login', 'auth', { provider: session?.user?.app_metadata?.provider });
          }).catch(err => console.error('[AuthProvider] logActivity login:', err));
        }
      } else if (event === 'SIGNED_OUT') {
        // Explicit sign-out — clear immediately, no grace period.
        clearUserState(event);
      } else if (hadCachedUser && !initialDone) {
        // INITIAL_SESSION with null but we had cached data — token may be
        // refreshing. Wait 3s grace period before clearing to avoid flash.
        graceTimer = setTimeout(() => {
          console.warn('[AuthProvider] Grace period expired — session not restored, clearing user');
          clearUserState(event);
        }, 3000);
        // Don't set loading=false yet — keep showing cached UI.
        initialDone = true;
        return;
      } else {
        clearUserState(event);
      }
      initialDone = true;
      setLoading(false);
    });

    // Safety net: if onAuthStateChange never fires (shouldn't happen, but
    // protects against Supabase SDK edge cases), stop the loading spinner.
    // Slice 263: bumped 5s → 12s. iOS 18.7 Mobile Safari can take 4-8s for
    // the SDK to fire INITIAL_SESSION on cold session-restore — a 5s safety
    // would race with the legitimate event and silently mark the user
    // anonymous mid-restore. 12s gives iOS enough headroom while still
    // protecting against true SDK-hangs.
    const safetyTimer = setTimeout(() => {
      if (!initialDone) {
        console.warn('[AuthProvider] onAuthStateChange did not fire within 12s — keeping cached data');
        setLoading(false);
      }
    }, 12000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
      if (graceTimer) clearTimeout(graceTimer);
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, profileLoading, refreshProfile, platformRole, clubAdmin }),
    [user, profile, loading, profileLoading, refreshProfile, platformRole, clubAdmin],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
