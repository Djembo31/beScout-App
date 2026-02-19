'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
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
  refreshProfile: () => Promise<void>;
  platformRole: PlatformAdminRole | null;
  clubAdmin: ClubAdminInfo | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
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
  const { profile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) router.replace('/onboarding');
  }, [loading, profile, router]);

  return { profile, loading };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Hydrate from sessionStorage — if we have cached data, skip the loading spinner
  const cachedUser = ssGet<User>(SS_USER);
  const cachedProfile = ssGet<Profile>(SS_PROFILE);
  const cachedPlatformRole = ssGet<PlatformAdminRole>(SS_PLATFORM_ROLE);
  const cachedClubAdmin = ssGet<ClubAdminInfo>(SS_CLUB_ADMIN);

  const [user, setUser] = useState<User | null>(cachedUser);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [loading, setLoading] = useState(!cachedUser);
  const [platformRole, setPlatformRole] = useState<PlatformAdminRole | null>(cachedPlatformRole);
  const [clubAdmin, setClubAdmin] = useState<ClubAdminInfo | null>(cachedClubAdmin);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const [p, pRole, cAdmin] = await Promise.allSettled([
        withTimeout(getProfile(userId), 5000),
        withTimeout(getPlatformAdminRole(userId), 5000),
        withTimeout(getClubAdminFor(userId), 5000),
      ]);

      if (p.status === 'fulfilled') {
        setProfile(p.value);
        if (p.value) {
          ssSet(SS_PROFILE, p.value);
          // Sync locale cookie from profile language for next-intl
          if (typeof document !== 'undefined' && p.value.language) {
            document.cookie = `bescout-locale=${p.value.language};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
          }
        }
      }

      const role = pRole.status === 'fulfilled' ? pRole.value : null;
      setPlatformRole(role);
      if (role) ssSet(SS_PLATFORM_ROLE, role); else try { sessionStorage.removeItem(SS_PLATFORM_ROLE); } catch (err) { console.error('[AuthProvider] removeItem platformRole:', err); }

      const ca = cAdmin.status === 'fulfilled' ? cAdmin.value : null;
      setClubAdmin(ca);
      if (ca) ssSet(SS_CLUB_ADMIN, ca); else try { sessionStorage.removeItem(SS_CLUB_ADMIN); } catch (err) { console.error('[AuthProvider] removeItem clubAdmin:', err); }
    } catch {
      // Profile load failed — keep cached data if any
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    // Verify session in background — even if we hydrated from sessionStorage
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          ssSet(SS_USER, u);
          // Wait for profile before marking as loaded — prevents blank screen
          // when sessionStorage is empty (first visit / mobile)
          await loadProfile(u.id);
        } else {
          // Session expired or invalid — clear everything
          setProfile(null);
          setPlatformRole(null);
          setClubAdmin(null);
          ssClear();
          queryClient.clear();
        }
        setLoading(false);
      })
      .catch(() => {
        // Network error / Supabase down — treat as logged out
        setUser(null);
        setProfile(null);
        setPlatformRole(null);
        setClubAdmin(null);
        ssClear();
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        ssSet(SS_USER, u);
        await loadProfile(u.id);
        // Activity log — login
        if (_event === 'SIGNED_IN') {
          import('@/lib/services/activityLog').then(({ logActivity }) => {
            logActivity(u.id, 'login', 'auth', { provider: session?.user?.app_metadata?.provider });
          }).catch(err => console.error('[AuthProvider] logActivity login:', err));
        }
      } else {
        // Activity log — logout (before clearing)
        if (_event === 'SIGNED_OUT' && user) {
          import('@/lib/services/activityLog').then(({ logActivity, flushActivityLogs }) => {
            logActivity(user.id, 'logout', 'auth');
            flushActivityLogs();
          }).catch(err => console.error('[AuthProvider] logActivity logout:', err));
        }
        setProfile(null);
        setPlatformRole(null);
        setClubAdmin(null);
        ssClear();
        queryClient.clear();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, refreshProfile, platformRole, clubAdmin }),
    [user, profile, loading, refreshProfile, platformRole, clubAdmin],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
