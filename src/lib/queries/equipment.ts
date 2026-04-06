'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getEquipmentDefinitions, getEquipmentRanks, getUserEquipment } from '@/lib/services/equipment';

const FIVE_MIN = 5 * 60 * 1000;
const THIRTY_SEC = 30 * 1000;

/** Fetch all active equipment definitions (static config, 5min stale) */
export function useEquipmentDefinitions() {
  return useQuery({
    queryKey: qk.equipment.definitions(),
    queryFn: getEquipmentDefinitions,
    staleTime: FIVE_MIN,
  });
}

/** Fetch all equipment ranks (static config, 5min stale) */
export function useEquipmentRanks() {
  return useQuery({
    queryKey: qk.equipment.ranks(),
    queryFn: getEquipmentRanks,
    staleTime: FIVE_MIN,
  });
}

/** Fetch user's equipment inventory */
export function useUserEquipment(userId: string | undefined) {
  return useQuery({
    queryKey: qk.equipment.inventory(userId!),
    queryFn: () => getUserEquipment(userId!),
    enabled: !!userId,
    staleTime: THIRTY_SEC,
  });
}
