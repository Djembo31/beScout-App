'use client';

/**
 * Slice 152 — Wallet Query-Hook + Helpers (ersetzt WalletProvider).
 *
 * Teil der Phase-2-Money-Cleanup nach State-Sync-Audit (Commit `f0cfbc6b`).
 * Eliminiert `WalletProvider` Klasse-C-Pattern (Zwei-Provider-Duplikat
 * neben dem React-Query-Cache).
 *
 * # Single Source of Truth
 *
 * Query-Key `['wallet', userId]` (user-scoped). `qk.wallet.all = ['wallet']`
 * bleibt als Prefix funktional: React-Query-`invalidateQueries(['wallet'])`
 * trifft jeden user-scoped Key automatisch. Die 7 bereits existierenden
 * `invalidateQueries({ queryKey: qk.wallet.all })`-Aufrufe in ScoreRoadCard,
 * MembershipSection, MissionBanner, useHomeData, founding, missions, TipButton
 * funktionieren unverändert.
 *
 * # Pattern — folgt useToggleFollowClub-Blaupause (Slice 151b-RESET)
 *
 * - Read-Only-Consumer: `const { balanceCents } = useWallet()`
 * - Mutation-Optimistic: `setWalletBalance(qc, uid, result.new_balance)` im onSuccess
 *   (ersetzt das alte `setBalanceCents` des Providers; deterministisch aus RPC-Response)
 * - Mutation-Reconcile: `invalidateWallet(qc)` im onSettled (ersetzt `refreshBalance()`)
 * - Logout: `removeWalletFromCache(qc)` im signOut-Handler (verhindert Cross-User-Leak)
 *
 * # Freshness-Semantik
 *
 * `useIsBalanceFresh()` ersetzt die identisch-benannte WalletProvider-Api.
 * Semantik: Daten wurden innerhalb der letzten 30s vom Server geladen UND kein
 * Fetch gerade in-flight. Nutzung: BuyModal/BuyOrderModal — Confirm-Button
 * disabled bis Freshness OK.
 *
 * # Retry + Visibility
 *
 * React-Query-Default: 3 Retries mit exponential backoff, refetchOnWindowFocus
 * true. Semantisch identisch zum alten Provider (3 Retries RETRY_DELAYS
 * [0, 1000, 3000] + Visibility-Recovery). ~170 LOC Custom-Code entfallen.
 *
 * # pgBouncer Read-After-Write (common-errors.md §2)
 *
 * Nach Trade-RPC: `setWalletBalance` im onSuccess (deterministic from server
 * response), `invalidateWallet` erst im onSettled (nach Commit-Fenster).
 * Verhindert Stale-Read-Transient bei gleich-gerichteter Invalidation.
 */

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/AuthProvider';
import { getWallet } from '@/lib/services/wallet';
import { logSilentCatch } from '@/lib/observability/silentRejects';
import type { DbWallet } from '@/types';

// Freshness window — balance fetched within the last 30s is considered safe
// for Buy/Sell confirm actions. Matches the old WalletProvider constant.
const FRESHNESS_WINDOW_MS = 30_000;

// Default staleTime: gleich dem Freshness-Window. Tradeoff: Nach 30s gilt der
// Cache als stale und wird bei Consumer-Mount oder Window-Focus refetched.
// Trade-Mutations invalidieren via invalidateWallet explizit, unabhängig vom
// staleTime.
const WALLET_STALE_TIME_MS = 30_000;

/**
 * User-scoped query key. `qk.wallet.all = ['wallet']` bleibt als Prefix-Matcher
 * funktional — daher kein keys.ts-Edit hier (Konflikt-Vermeidung mit parallelem
 * 151b-RESET-BUILD).
 */
export function walletQueryKey(userId: string): readonly [string, string] {
  return ['wallet', userId] as const;
}

export interface UseWalletResult {
  /** Balance in cents. `null` wenn kein User oder noch loading. */
  balanceCents: number | null;
  /** Locked balance in cents (Escrow). `null` wenn kein User oder loading. */
  lockedBalanceCents: number | null;
  /** `true` solange initialer Fetch läuft. */
  isLoading: boolean;
  /** `true` während aktivem Refetch (background oder manual). */
  isFetching: boolean;
  /** Unix-ms des letzten erfolgreichen Fetches, oder 0. */
  dataUpdatedAt: number;
  /** Query-Error oder null. */
  error: Error | null;
}

/**
 * Query-Hook für Wallet-Balance. Ersetzt `WalletProvider.balanceCents` +
 * `lockedBalanceCents`. Auto-Gate via `enabled: !!userId`.
 *
 * Verwendung:
 * ```tsx
 * const { balanceCents, isLoading } = useWallet();
 * if (isLoading || balanceCents === null) return <Skeleton />;
 * return <div>{fmtScout(centsToBsd(balanceCents))}</div>;
 * ```
 */
export function useWallet(): UseWalletResult {
  const { user } = useUser();
  const userId = user?.id;

  const query = useQuery<DbWallet | null, Error>({
    queryKey: userId ? walletQueryKey(userId) : ['wallet', 'no-user'] as const,
    queryFn: () => getWallet(userId!),
    enabled: !!userId,
    staleTime: WALLET_STALE_TIME_MS,
    // React-Query-Default `refetchOnWindowFocus: true` bleibt — Visibility-
    // Recovery identisch zum alten Provider-useEffect-Handler.
    // React-Query-Default 3 Retries mit exponential backoff — identisch zum
    // alten Provider RETRY_DELAYS [0, 1000, 3000].
  });

  // Query-Errors via Observability. onError-Callback auf useQuery ist in v5
  // deprecated; wir greifen bewusst nicht zum QueryClient-globalen Handler
  // (würde andere Queries miterfassen). Stattdessen: expliziter Log wenn
  // Consumer den Error beobachtet. Ausreichend weil Trading-Consumer den
  // Error-State via `balanceCents === null` rendern (siehe UI-Spec).
  if (query.error) {
    logSilentCatch('wallet.fetch', query.error);
  }

  return {
    balanceCents: query.data?.balance ?? null,
    lockedBalanceCents: query.data?.locked_balance ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    dataUpdatedAt: query.dataUpdatedAt,
    error: query.error,
  };
}

/**
 * Freshness-Flag: wurde Balance innerhalb der letzten 30s vom Server geladen
 * UND läuft kein Fetch gerade? Used by BuyModal/BuyOrderModal zum Disablen
 * des Confirm-Buttons vor Cold-Start.
 *
 * Behält Semantik der alten `WalletProvider.isBalanceFresh`-Api.
 */
export function useIsBalanceFresh(): boolean {
  const { isFetching, dataUpdatedAt } = useWallet();
  if (isFetching) return false;
  if (dataUpdatedAt === 0) return false;
  return Date.now() - dataUpdatedAt < FRESHNESS_WINDOW_MS;
}

// ============================================
// Mutation Helpers (für Trading onSuccess/onSettled)
// ============================================

/**
 * Deterministisches Wallet-Update aus RPC-Response. Nutzung im onSuccess-
 * Handler von Buy/Sell/Subscribe-Mutations. Ersetzt `setBalanceCents()` des
 * alten Providers.
 *
 * Merged in das existierende Cache-Object (Preserve `locked_balance`,
 * `created_at`, `updated_at`) — kein vollständiger Overwrite, sonst flackert
 * das UI auf undefined.
 *
 * @example
 * ```ts
 * onSuccess: (result) => {
 *   if (result.new_balance != null) {
 *     setWalletBalance(queryClient, userId, result.new_balance);
 *   }
 * }
 * ```
 */
export function setWalletBalance(
  queryClient: QueryClient,
  userId: string,
  newBalanceCents: number,
): void {
  queryClient.setQueryData<DbWallet | null>(walletQueryKey(userId), (prev) => {
    if (prev === null || prev === undefined) return prev;
    if (prev.balance === newBalanceCents) return prev;
    return { ...prev, balance: newBalanceCents };
  });
}

/**
 * Setzt Locked-Balance deterministisch (für Escrow-Flows: Bounty-Create,
 * Offer-Create — wo RPC `new_locked` zurückgibt).
 */
export function setWalletLockedBalance(
  queryClient: QueryClient,
  userId: string,
  newLockedCents: number,
): void {
  queryClient.setQueryData<DbWallet | null>(walletQueryKey(userId), (prev) => {
    if (prev === null || prev === undefined) return prev;
    if (prev.locked_balance === newLockedCents) return prev;
    return { ...prev, locked_balance: newLockedCents };
  });
}

/**
 * Invalidiert alle Wallet-Queries (prefix-match auf `['wallet']`). Nutzung
 * im onSettled-Handler von Money-Mutations. Ersetzt `refreshBalance()` des
 * alten Providers.
 *
 * pgBouncer-safe: wird im onSettled (nach Commit-Fenster) gerufen, nicht
 * parallel zum onSuccess-setWalletBalance.
 */
export function invalidateWallet(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ['wallet'] });
}

/**
 * Entfernt Wallet-Cache komplett. Nutzung im signOut-Handler (AuthProvider)
 * — verhindert Cross-User-Balance-Leak bei Account-Switch.
 *
 * @example
 * ```ts
 * // AuthProvider signOut:
 * await supabase.auth.signOut();
 * removeWalletFromCache(queryClient);
 * ```
 */
export function removeWalletFromCache(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: ['wallet'] });
}
