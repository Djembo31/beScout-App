'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { captureException as sentryCaptureException } from '@sentry/nextjs';
import { getQueryClient } from '@/lib/queryClient';

// ============================================
// Slice 261 (2026-04-30) — TanStack Query Persist-Cache
// ============================================
//
// Persists READ-ONLY public/static query data to localStorage so returning
// users see instant warm cache instead of skeleton on first visit (Smoking-
// Gun #6 from Slice 259/260 deep-dive).
//
// Cross-user-pollution prevention is layered:
//   1. shouldDehydrateQuery filter (this file): allowlist of public-static
//      domains, deny on any UUID-bearing key, deny on user-scope domain
//   2. queryClient.clear() in AuthProvider's User-Switch-Detect (Slice 260)
//      cascades to localStorage automatically (persist subscribes to changes)
//   3. Status-success-only filter (no in-flight or error queries persisted)
//
// SSR-safe: persist init runs in useEffect with typeof window guard.
// QueryClientProvider stays unchanged so children don't re-mount on
// persist-init (subscribed via persistQueryClient function-pattern).
//
// Cache-bump strategy: increment LOCALSTORAGE_KEY suffix (`v1` → `v2`) when
// breaking changes to qk-shape happen — discards old cache on first load.

const LOCALSTORAGE_KEY = 'BESCOUT_QUERY_CACHE_v1';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 min — public-data drift tolerance
const THROTTLE_MS = 1000; // max 1× write per second

// Domains that contain user-specific data (RLS-protected) — NEVER persist.
// Conservative: when in doubt, add here.
//
// Slice 261 P1-Heal (post-Reviewer): 4 inline-keyed domains added below
// (`home`, `streaks`, `wildcards`, `rankings`) — these live OUTSIDE the
// qk-Factory in `src/lib/queries/keys.ts`, so Pflicht-Audit was missing them.
// Layer-3 UUID-regex backup is unreliable for these because user-id can be
// `undefined` during the auth-race window (key becomes `[..., undefined]`,
// JSON.stringify drops the slot — no UUID match → persist would pass).
//
// Audit-Command for future audits when adding cache to a new query:
//   grep -rn "queryKey:\\s*\\['" src/ --include="*.tsx" --include="*.ts"
const USER_SCOPED_DOMAINS = new Set([
  // qk-Factory domains
  'holdings',
  'wallet',
  'orders',
  'watchlist',
  'notifications',
  'offers',
  'transactions',
  'social',
  'cosmetics',
  'mystery-box',
  'tickets',
  'gamification',
  'scouting',
  'home-dashboard',
  'market-dashboard',
  'fantasy-leagues',
  'founding-passes',
  'fan-ranking',
  'creatorFund',
  'airdrop',
  'missions',
  'scoutSubs',
  'tips',
  'clubAdmin',
  'fanWishes',
  // Inline-keyed user-scope domains (NOT in qk-Factory) — Slice 261 Reviewer-Heal
  'home',       // LastGameweekWidget: ['home', 'lastFantasyResult', uid] etc.
  'streaks',    // useLoginStreak: ['streaks', 'login', userId]
  'wildcards',  // useWildcardHistory: ['wildcards', 'history', userId, limit]
  'rankings',   // LastEventResults: ['rankings', 'lastEvent', user?.id] etc.
]);

// UUID v4 regex — any key containing one is treated as id-bearing and skipped
// defensively. Public-aggregate-with-club-id is sacrificed for safety.
const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Slice 471 (W6): request-scoped auf dem Server, Singleton im Browser.
  // Im Browser stabil (gleiche Instanz wie der imperative `queryClient`-Singleton).
  const client = getQueryClient();

  useEffect(() => {
    // SSR-Guard: persist requires window.localStorage
    if (typeof window === 'undefined') return;

    let unsubscribe: (() => void) | undefined;

    try {
      const persister = createSyncStoragePersister({
        storage: window.localStorage,
        key: LOCALSTORAGE_KEY,
        throttleTime: THROTTLE_MS,
      });

      const [persistUnsubscribe] = persistQueryClient({
        queryClient: client,
        persister,
        maxAge: MAX_AGE_MS,
        buster: 'v2-slice267',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Layer 1: only success queries (no in-flight, no errors)
            if (query.state.status !== 'success') return false;

            // Layer 2: skip user-scoped domains
            const firstKey = query.queryKey[0];
            if (
              typeof firstKey === 'string' &&
              USER_SCOPED_DOMAINS.has(firstKey)
            ) {
              return false;
            }

            // Layer 3: skip any key containing a UUID (defensive — could be
            // user-id OR public club-id; we sacrifice club-scoped aggregate
            // caching for safety against future user-id leaks)
            const keyStr = JSON.stringify(query.queryKey);
            if (UUID_REGEX.test(keyStr)) return false;

            // Layer 4 (Slice 267 EMERGENCY): Skip Map/Set-typed query data.
            // JSON.stringify(new Map()) === '{}' — Maps cannot survive the
            // persist round-trip. Without this filter, Map-returning services
            // (getFixtureDeadlinesByGameweek, getRecentPlayerMinutes etc.)
            // rehydrate as Plain-Objects, and consumer hooks like
            // useFixtureDeadlines crash with "n.values is not a function".
            const data = query.state.data;
            if (data instanceof Map || data instanceof Set) return false;

            return true;
          },
        },
      });

      unsubscribe = persistUnsubscribe;
    } catch (err) {
      // Privacy-Mode, Quota-Exceeded, etc. — fall back to in-memory only.
      // Slice 261 P3-Heal (Reviewer): observability via Sentry so we know
      // when persist degrades silently in real-world Privacy-Mode users.
      console.error('[QueryProvider] persist init failed:', err);
      sentryCaptureException(err, {
        tags: { component: 'QueryProvider', stage: 'persist-init' },
      });
    }

    return () => {
      unsubscribe?.();
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
