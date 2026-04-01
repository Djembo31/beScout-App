'use client';

import { useQuery } from '@tanstack/react-query';
import { getEventLeaderboard, getProgressiveScores } from '../services/scoring.queries';
import { qk } from '@/lib/queries/keys';

/**
 * Replaces EventDetailModal lines 108-127:
 * Load leaderboard for an event, poll every 30s when running.
 */
export function useLeaderboard(
  eventId: string | undefined,
  options?: { enabled?: boolean; isRunning?: boolean },
) {
  return useQuery({
    queryKey: qk.fantasy.leaderboard(eventId),
    queryFn: () => getEventLeaderboard(eventId!),
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 15_000,
    refetchInterval: options?.isRunning ? 30_000 : false,
  });
}

/**
 * Replaces EventDetailModal lines 130-146:
 * Poll progressive scores when event is running and user has a lineup.
 */
export function useProgressiveScores(
  gameweek: number | undefined,
  playerIds: string[],
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: qk.fantasy.progressiveScores(gameweek, playerIds),
    queryFn: () => getProgressiveScores(gameweek!, playerIds),
    enabled: options?.enabled !== false && !!gameweek && playerIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
