'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getUserCosmetics, getEquippedCosmetics, getBatchEquippedCosmetics } from '@/lib/services/cosmetics';
import type { EquippedCosmeticsLookup } from '@/lib/services/cosmetics';

const TWO_MIN = 2 * 60 * 1000;

/** Fetch all cosmetics owned by a user */
export function useUserCosmetics(userId: string | undefined) {
  return useQuery({
    queryKey: qk.cosmetics.user(userId!),
    queryFn: () => getUserCosmetics(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

/** Fetch only equipped cosmetics for a user */
export function useEquippedCosmetics(userId: string | undefined) {
  return useQuery({
    queryKey: qk.cosmetics.equipped(userId!),
    queryFn: () => getEquippedCosmetics(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

/** Batch-fetch equipped cosmetics for multiple users (frame + title lookup map) */
export function useBatchEquippedCosmetics(userIds: string[]) {
  const key = userIds.length > 0 ? userIds.slice().sort().join(',') : '';
  return useQuery<Map<string, EquippedCosmeticsLookup>>({
    queryKey: qk.cosmetics.batchEquipped(key),
    queryFn: () => getBatchEquippedCosmetics(userIds),
    enabled: userIds.length > 0,
    staleTime: TWO_MIN,
  });
}

export type { EquippedCosmeticsLookup };
