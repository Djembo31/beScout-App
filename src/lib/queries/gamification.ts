'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getScoutScores, getScoutLeaderboard, getScoreRoadClaims } from '@/lib/services/gamification';
import type { Dimension } from '@/lib/gamification';

const FIVE_MIN = 5 * 60 * 1000;

/** Fetch the user's Scout Scores (trader + manager + analyst) */
export function useScoutScores(userId: string | undefined) {
  return useQuery({
    queryKey: qk.gamification.scoutScores(userId!),
    queryFn: () => getScoutScores(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}

/** Fetch Scout Score leaderboard by dimension or overall (median) */
export function useScoutLeaderboard(dimension: Dimension | 'overall' = 'overall', limit: number = 20) {
  return useQuery({
    queryKey: qk.gamification.leaderboardByDim(dimension, limit),
    queryFn: () => getScoutLeaderboard(dimension, limit),
    staleTime: FIVE_MIN,
  });
}

/** Fetch which Score Road milestones the user has already claimed */
export function useScoreRoadClaims(userId: string | undefined) {
  return useQuery({
    queryKey: qk.gamification.scoreRoad(userId!),
    queryFn: () => getScoreRoadClaims(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}
