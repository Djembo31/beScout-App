'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getPlayers, getPlayerById, getPlayersByClubId, getPlayerNames, getPlayerPercentiles, dbToPlayers } from '@/lib/services/players';
import type { PlayerName } from '@/lib/services/players';
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

/** Players by club ID */
export function usePlayersByClub(clubId: string | undefined) {
  return useQuery<DbPlayer[]>({
    queryKey: qk.players.byClub(clubId!),
    queryFn: () => getPlayersByClubId(clubId!),
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
