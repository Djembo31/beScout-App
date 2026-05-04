'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import {
  getPlayers,
  getPlayerById,
  getPlayersByClubId,
  getPlayerNames,
  getPlayerPercentiles,
  getPlayerPriceChanges7d,
  dbToPlayers,
} from '@/lib/services/players';
import type { PlayerName, PriceChange7d } from '@/lib/services/players';
import type { DbPlayer } from '@/types';

const FIVE_MIN = 5 * 60 * 1000;

/** Raw DB players — for Compare, Club pages that need DbPlayer[] */
export function useRawPlayers() {
  return useQuery<DbPlayer[]>({
    queryKey: qk.players.raw,
    queryFn: getPlayers,
    staleTime: FIVE_MIN,
  });
}

/** All players — shared across Market, Home, Community */
export function usePlayers(enabled = true) {
  return useQuery({
    queryKey: qk.players.all,
    queryFn: async () => dbToPlayers(await getPlayers()),
    staleTime: FIVE_MIN,
    enabled,
  });
}

/** Players by club ID. `activeOnly=true` filtert `mv_source='transfermarkt_stale'` (Slice 083). */
export function usePlayersByClub(clubId: string | undefined, activeOnly = false) {
  return useQuery<DbPlayer[]>({
    queryKey: qk.players.byClub(clubId!, activeOnly),
    queryFn: () => getPlayersByClubId(clubId!, { activeOnly }),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
  });
}

/** Lightweight player names — for dropdowns/autocomplete (4 columns vs full DbPlayer) */
export function usePlayerNames() {
  return useQuery<PlayerName[]>({
    queryKey: qk.players.names,
    queryFn: getPlayerNames,
    staleTime: FIVE_MIN,
  });
}

/** Pre-computed server-side percentile ranks — replaces client-side usePlayers() overfetch */
export function usePlayerPercentiles(playerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...qk.players.byId(playerId!), 'percentiles'],
    queryFn: () => getPlayerPercentiles(playerId!),
    enabled: !!playerId && enabled,
    staleTime: FIVE_MIN,
  });
}

/** Single raw DbPlayer by ID — for pages that need both Player + raw fields (dpc_available) */
export function useDbPlayerById(id: string | undefined) {
  return useQuery<DbPlayer | null>({
    queryKey: [...qk.players.byId(id!), 'raw'],
    queryFn: async () => (await getPlayerById(id!)) ?? null,
    enabled: !!id,
    staleTime: FIVE_MIN,
  });
}

/**
 * Slice 268b (D63 Phase 3) — 7-day price-change top-movers, cached.
 *
 * Replaces the legacy `useState/useEffect + getPlayerPriceChanges7d(...)`
 * pattern in `useHomeData` with TanStack-Query caching:
 *   - 5-min staleTime → no roundtrip on tab-switch / re-mount within window
 *   - Deterministic cache key: `playerIds.slice().sort().join(',')`
 *   - `enabled: playerIds.length >= 2` mirrors existing useHomeData logic
 *
 * Persist (localStorage) is NOT used — Player-IDs are UUIDs, so
 * QueryProvider Layer 3 `UUID_REGEX` skips persist automatically. In-memory
 * cache is sufficient for the Battery-Drain mitigation (Cross-Persona
 * Top-Finding #3 in D63).
 *
 * Caller-stability requirement: pass a memoized `playerIds` array
 * (`useMemo(() => holdings.map(h => h.playerId), [holdings])`) to keep the
 * cache key stable across renders.
 */
export function usePlayerPriceChanges7d(
  playerIds: string[] | undefined,
  limit: number,
) {
  const playerIdsKey = useMemo(
    () => (playerIds ?? []).slice().sort().join(','),
    [playerIds],
  );
  return useQuery<PriceChange7d[]>({
    queryKey: qk.priceChanges.byPlayers(playerIdsKey, limit),
    queryFn: () => getPlayerPriceChanges7d(playerIds, limit),
    enabled: !!playerIds && playerIds.length >= 2,
    staleTime: FIVE_MIN,
  });
}
