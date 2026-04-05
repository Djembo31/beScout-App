'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { getAuthState } from '@/lib/services/auth-state';
import { getProfile } from '@/lib/services/profiles';
import { getPlatformAdminRole, type PlatformAdminRole } from '@/lib/services/platformAdmin';
import { getClubAdminFor } from '@/lib/services/club';
import { withTimeout } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';
import type { Profile, ClubAdminRole } from '@/types';

// ============================================
// SessionStorage helpers
// ============================================

const SS_USER = 'bs_user';
const SS_PROFILE = 'bs_profile';
const SS_PLATFORM_ROLE = 'bs_platform_role';
const SS_CLUB_ADMIN = 'bs_club_admin';

function ssGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function ssSet(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (err) { console.error('[AuthProvider] ssSet quota exceeded:', err); }
}

function ssClear(): void {
  try {
    sessionStorage.removeItem(SS_USER);
    sessionStorage.removeItem(SS_PROFILE);
    sessionStorage.removeItem(SS_PLATFORM_ROLE);
    sessionStorage.removeItem(SS_CLUB_ADMIN);
  } catch (err) { console.error('[AuthProvider] ssClear:', err); }
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
  // IMPORTANT: Never read sessionStorage in useState initializers — it doesn't
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
        ssSet(SS_PROFILE, authState.profile);
        if (typeof document !== 'undefined' && authState.profile.language) {
          document.cookie = `bescout-locale=${authState.profile.language};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
        }
      }

      setPlatformRole(authState.platformRole);
      if (authState.platformRole) ssSet(SS_PLATFORM_ROLE, authState.platformRole); else try { sessionStorage.removeItem(SS_PLATFORM_ROLE); } catch (err) { console.error('[AuthProvider] removeItem platformRole:', err); }

      setClubAdmin(authState.clubAdmin);
      if (authState.clubAdmin) ssSet(SS_CLUB_ADMIN, authState.clubAdmin); else try { sessionStorage.removeItem(SS_CLUB_ADMIN); } catch (err) { console.error('[AuthProvider] removeItem clubAdmin:', err); }
    };

    // Try primary RPC
    try {
      const authState = await withTimeout(getAuthState(userId), 10000);
      applyAuthState(authState);
      if (!_isRefresh) setProfileLoading(false);
      return;
    } catch (err) {
      console.error('[AuthProvider] loadProfile RPC failed, falling back to 3 queries:', err);
    }

    // Fallback: 3 separate queries
    try {
      const [p, pRole, cAdmin] = await Promise.allSettled([
        withTimeout(getProfile(userId), 8000),
        withTimeout(getPlatformAdminRole(userId), 8000),
        withTimeout(getClubAdminFor(userId), 8000),
      ]);

      if (p.status === 'fulfilled') {
        setProfile(p.value);
        if (p.value) {
          ssSet(SS_PROFILE, p.value);
          if (typeof document !== 'undefined' && p.value.language) {
            document.cookie = `bescout-locale=${p.value.language};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
          }
        }
      }

      const role = pRole.status === 'fulfilled' ? pRole.value : null;
      setPlatformRole(role);
      if (role) ssSet(SS_PLATFORM_ROLE, role); else try { sessionStorage.removeItem(SS_PLATFORM_ROLE); } catch (err2) { console.error('[AuthProvider] removeItem platformRole:', err2); }

      const ca = cAdmin.status === 'fulfilled' ? cAdmin.value : null;
      setClubAdmin(ca);
      if (ca) ssSet(SS_CLUB_ADMIN, ca); else try { sessionStorage.removeItem(SS_CLUB_ADMIN); } catch (err2) { console.error('[AuthProvider] removeItem clubAdmin:', err2); }

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
    // Hydrate from sessionStorage (client-only) for instant UI.
    // This runs after hydration so no server/client mismatch.
    const cachedUser = ssGet<User>(SS_USER);
    const cachedProfile = ssGet<Profile>(SS_PROFILE);
    const cachedPlatformRole = ssGet<PlatformAdminRole>(SS_PLATFORM_ROLE);
    const cachedClubAdmin = ssGet<ClubAdminInfo>(SS_CLUB_ADMIN);
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
      currentUserId = null;
      setUser(null);
      setProfile(null);
      setProfileLoading(false);
      setPlatformRole(null);
      setClubAdmin(null);
      ssClear();

      // Only clear React Query cache on explicit sign-out action.
      if (event === 'SIGNED_OUT') {
        setTimeout(() => queryClient.clear(), 0);
      }
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;

      // Cancel any pending grace timer — a real event arrived.
      if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }

      if (u) {
        setUser(u);
        ssSet(SS_USER, u);
        currentUserId = u.id;
        await loadProfile(u.id);
        if (event === 'TOKEN_REFRESHED') {
          // Queries may have fired with expired token during cache-hydrated UI.
          // Invalidate so they refetch with the fresh token.
          queryClient.invalidateQueries();
        }
        if (event === 'SIGNED_IN') {
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
    const safetyTimer = setTimeout(() => {
      if (!initialDone) {
        console.warn('[AuthProvider] onAuthStateChange did not fire within 5s — keeping cached data');
        setLoading(false);
      }
    }, 5000);

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
