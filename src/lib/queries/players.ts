'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getPlayers, getPlayerById, getPlayersByClubId, dbToPlayers, dbToPlayer } from '@/lib/services/players';
import type { DbPlayer } from '@/types';

const FIVE_MIN = 5 * 60 * 1000;

/** Raw DB players — for Compare, Club pages that need DbPlayer[] */
export function useRawPlayers() {
  return useQuery<DbPlayer[]>({
    queryKey: [...qk.players.all, 'raw'],
    queryFn: getPlayers,
    staleTime: FIVE_MIN,
  });
}

/** All players — shared across Market, Home, Community */
export function usePlayers() {
  return useQuery({
    queryKey: qk.players.all,
    queryFn: async () => dbToPlayers(await getPlayers()),
    staleTime: FIVE_MIN,
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

/** Single player by ID */
export function usePlayerById(id: string | undefined) {
  return useQuery({
    queryKey: qk.players.byId(id!),
    queryFn: async () => {
      const db = await getPlayerById(id!);
      return db ? dbToPlayer(db) : null;
    },
    enabled: !!id,
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
