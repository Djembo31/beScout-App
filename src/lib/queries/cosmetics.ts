'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getUserCosmetics, getEquippedCosmetics } from '@/lib/services/cosmetics';

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
