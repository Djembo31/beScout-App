'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from './keys';
import { getCurrentSeason } from '@/lib/chips';
import {
  activateChip,
  deactivateChip,
  getEventChips,
  getSeasonChipUsage,
} from '@/lib/services/chips';
import type { SeasonChipUsage } from '@/lib/services/chips';
import type { ChipType } from '@/types';

const THIRTY_SEC = 30 * 1000;
const ONE_MIN = 60 * 1000;

/** Fetch user's active chips for a specific event */
export function useEventChips(eventId: string) {
  return useQuery({
    queryKey: qk.chips.event(eventId),
    queryFn: () => getEventChips(eventId),
    enabled: !!eventId,
    staleTime: THIRTY_SEC,
  });
}

/** Fetch user's chip usage for the current season */
export function useSeasonChipUsage() {
  return useQuery<SeasonChipUsage | null>({
    queryKey: qk.chips.season(getCurrentSeason()),
    queryFn: () => getSeasonChipUsage(),
    staleTime: ONE_MIN,
  });
}

/** Mutation: activate a chip for an event */
export function useActivateChip(userId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { eventId: string; chipType: ChipType }) => {
      const result = await activateChip(params.eventId, params.chipType);
      if (!result.success) throw new Error(result.error ?? 'Chip-Aktivierung fehlgeschlagen');
      return result;
    },
    onSuccess: (_data, variables) => {
      // Invalidate event chips for the specific event
      qc.invalidateQueries({ queryKey: qk.chips.event(variables.eventId) });
      // Invalidate season usage (chip counts may have changed)
      qc.invalidateQueries({ queryKey: qk.chips.season(getCurrentSeason()) });
      // Invalidate ticket balance (tickets were spent)
      if (userId) {
        qc.invalidateQueries({ queryKey: qk.tickets.balance(userId) });
        qc.invalidateQueries({ queryKey: qk.tickets.transactions(userId) });
      }
    },
  });
}

/** Mutation: deactivate a chip for an event (looks up chip_usage_id from event chips) */
export function useDeactivateChip(userId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { eventId: string; chipType: ChipType }) => {
      // Find the active chip_usage_id for this event+type
      const eventChips = await getEventChips(params.eventId);
      const match = eventChips.find(c => c.chip_type === params.chipType);
      if (!match) throw new Error('Chip nicht aktiv');

      const result = await deactivateChip(match.id);
      if (!result.success) throw new Error(result.error ?? 'Chip-Deaktivierung fehlgeschlagen');
      return result;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.chips.event(variables.eventId) });
      qc.invalidateQueries({ queryKey: qk.chips.season(getCurrentSeason()) });
      if (userId) {
        qc.invalidateQueries({ queryKey: qk.tickets.balance(userId) });
        qc.invalidateQueries({ queryKey: qk.tickets.transactions(userId) });
      }
    },
  });
}
