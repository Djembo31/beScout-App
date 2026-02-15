'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { getProfile } from '@/lib/services/profiles';
import { invalidateAll, withTimeout } from '@/lib/cache';
import type { Profile } from '@/types';

// ============================================
// SessionStorage helpers
// ============================================

const SS_USER = 'bs_user';
const SS_PROFILE = 'bs_profile';

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
  } catch { /* quota exceeded — ignore */ }
}

function ssClear(): void {
  try {
    sessionStorage.removeItem(SS_USER);
    sessionStorage.removeItem(SS_PROFILE);
  } catch { /* ignore */ }
}

// ============================================
// Context
// ============================================

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function useUser() {
  return useContext(AuthContext);
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

  const [user, setUser] = useState<User | null>(cachedUser);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [loading, setLoading] = useState(!cachedUser);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const p = await withTimeout(getProfile(userId), 5000);
      setProfile(p);
      if (p) ssSet(SS_PROFILE, p);
    } catch {
      // Profile load failed — keep cached profile if any
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
          ssClear();
          invalidateAll();
        }
        setLoading(false);
      })
      .catch(() => {
        // Network error / Supabase down — treat as logged out
        setUser(null);
        setProfile(null);
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
          }).catch(() => {});
        }
      } else {
        // Activity log — logout (before clearing)
        if (_event === 'SIGNED_OUT' && user) {
          import('@/lib/services/activityLog').then(({ logActivity, flushActivityLogs }) => {
            logActivity(user.id, 'logout', 'auth');
            flushActivityLogs();
          }).catch(() => {});
        }
        setProfile(null);
        ssClear();
        invalidateAll();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, refreshProfile }),
    [user, profile, loading, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
