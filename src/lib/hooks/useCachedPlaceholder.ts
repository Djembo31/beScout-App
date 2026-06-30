'use client';

import { useState, useEffect, useMemo } from 'react';
import { readCached } from '@/lib/utils/cachedQuery';

/**
 * Slice 474 — SSR-safe read of a UID-keyed localStorage cache mirror, for use as
 * React-Query `placeholderData`.
 *
 * Returns `undefined` on the server AND on the first client render (hydration),
 * then the cached value after mount. This is the SSR-safe replacement for a bare
 * `useMemo(() => readCached(...))`.
 *
 * Why the gate is needed (Slice 472 regression):
 * A synchronous `readCached(prefix, uid)` returns `undefined` on the server (no
 * `window`/`localStorage`) and the cached value on the client. Before Slice 472,
 * `uid` was `undefined` during SSR (user resolved client-only), so the read was
 * skipped on both sides at first render — no divergence. Slice 472 seeds the user
 * server-side, so `uid` is now present at first render; the bare read then
 * diverges (server `undefined` → skeleton, client cached value → e.g. "12.501,47")
 * → React #418/#423 hydration mismatch on every authed page (wallet + tickets in
 * SideNav/TopBar/mobile drawer).
 *
 * Deferring the read to a mount effect keeps the first render identical on both
 * sides (both skeleton); the cached value fills in one tick later. `dataUpdatedAt`
 * stays 0 for `placeholderData`, so the money-path freshness gate
 * (`useIsBalanceFresh`) is unaffected.
 */
export function useCachedPlaceholder<T>(
  prefix: 'bs_wallet' | 'bs_tickets',
  uid: string | undefined,
): T | undefined {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  return useMemo<T | undefined>(
    () => (hydrated && uid ? readCached<T>(prefix, uid) : undefined),
    [hydrated, prefix, uid],
  );
}
