/**
 * cachedQuery — UID-keyed localStorage Mirror für React-Query Hooks (Slice 268).
 *
 * Zweck: Cold-Start-UX. Hooks lesen lokal gecachte Werte als `placeholderData`
 * → instant Render auf Mobile-Safari trotz Auth-SDK-Warmup-Latenz. Background
 * Refetch läuft normal weiter.
 *
 * Slice-265-Anti-Patterns vermieden:
 * - UID-keyed Slots (`bs_wallet_<uid>`) statt single-slot — Cross-User-Pollution-Schutz
 * - `placeholderData` (nicht `initialData`) → `dataUpdatedAt=0` bis Real-Data → Money-Path
 *   geschützt via `useIsBalanceFresh`
 * - SSR-safe: `typeof window === 'undefined'` Guard
 * - Korrupte JSON / Quota-Exceeded fail open mit Sentry-Breadcrumb (logSilentCatch)
 *
 * Slot-Naming-Convention: `bs_<feature>_<uid>` (e.g. `bs_wallet_abc123…`).
 *
 * User-Switch + SIGNED_OUT-Flows: AuthProvider ruft `clearCachedAllSlots()` synchron
 * neben existing `lsClear()` — verhindert Race-Window für SIGNED_OUT→SIGNED_IN-Same-Frame.
 */

import { logSilentCatch } from '@/lib/observability/silentRejects';

const SLOT_PREFIXES = ['bs_wallet_', 'bs_tickets_'] as const;

/** Read a UID-keyed JSON slot. Returns undefined for SSR / missing / corrupt. */
export function readCached<T>(prefix: 'bs_wallet' | 'bs_tickets', uid: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!uid) return undefined;
  const key = `${prefix}_${uid}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch (err) {
    logSilentCatch('cachedQuery.read', err);
    return undefined;
  }
}

/** Write a UID-keyed JSON slot. Fail-open on quota / SSR — never throws. */
export function writeCached(prefix: 'bs_wallet' | 'bs_tickets', uid: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  if (!uid) return;
  const key = `${prefix}_${uid}`;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    logSilentCatch('cachedQuery.write', err);
  }
}

/**
 * Clear ALL `bs_wallet_*` and `bs_tickets_*` slots regardless of UID.
 *
 * Called from AuthProvider on SIGNED_OUT and on User-Switch-Detect (Slice 260
 * pattern). MUST run synchronously next to existing `lsClear()` — NOT inside
 * setTimeout — otherwise SIGNED_OUT→SIGNED_IN-Same-Frame would render User-B
 * with User-A's stale slot data (Reviewer Finding #2).
 */
export function clearCachedAllSlots(): void {
  if (typeof window === 'undefined') return;
  try {
    const ls = window.localStorage;
    const keysToRemove: string[] = [];
    for (let i = 0; i < ls.length; i += 1) {
      const key = ls.key(i);
      if (!key) continue;
      if (SLOT_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) ls.removeItem(key);
  } catch (err) {
    logSilentCatch('cachedQuery.clearAllSlots', err);
  }
}
