'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from './keys';
import {
  getScoutScores,
  getScoreRoadClaims,
  getCurrentLigaSeason,
  getMonthlyLigaWinners,
  getFriendsLeaderboard,
  getMonthlyLeaderboard,
  getClubLeaderboard,
  getLigaRewardConfig,
  setLigaRewardConfig,
} from '@/lib/services/gamification';
import { getSeasonRanking } from '@/lib/services/scoutScores';

// FIX-06 (J9F-08): 30s for own scores (tier-up feedback needs to feel live).
// Leaderboards / Season / Monthly-Winners stay 5min (cold data, no self-feedback need).
const THIRTY_SEC = 30 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

/** Fetch the user's Scout Scores (trader + manager + analyst) */
export function useScoutScores(userId: string | undefined) {
  return useQuery({
    queryKey: qk.gamification.scoutScores(userId!),
    queryFn: () => getScoutScores(userId!),
    enabled: !!userId,
    staleTime: THIRTY_SEC,
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

/** Fetch the currently active Liga season */
export function useCurrentLigaSeason() {
  return useQuery({
    queryKey: qk.gamification.currentSeason,
    queryFn: () => getCurrentLigaSeason(),
    staleTime: FIVE_MIN,
  });
}

/** Fetch monthly Liga winners. `limit` controls how many rows (per-league winners
 *  interleave after global ones — Admin passes a higher limit to see them all). */
export function useMonthlyLigaWinners(month?: string, limit: number = 12) {
  return useQuery({
    queryKey: qk.gamification.monthlyWinners(month, limit),
    queryFn: () => getMonthlyLigaWinners(month, limit),
    staleTime: FIVE_MIN,
  });
}

/** Fetch per-league BeScout-Saison reward config (E-2b). All active leagues + amounts. */
export function useLigaRewardConfigs() {
  return useQuery({
    queryKey: qk.gamification.ligaRewardConfig,
    queryFn: () => getLigaRewardConfig(),
    staleTime: FIVE_MIN,
  });
}

/** Mutation: set a league's BeScout-Saison reward amounts (platform-admin only). */
export function useSetLigaRewardConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { leagueId: string; rank1Cents: number; rank2Cents: number; rank3Cents: number }) =>
      setLigaRewardConfig(vars.leagueId, vars.rank1Cents, vars.rank2Cents, vars.rank3Cents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.gamification.ligaRewardConfig });
    },
  });
}

/** Fetch friends leaderboard (users the current user follows + self) */
export function useFriendsLeaderboard(userId: string | undefined) {
  return useQuery({
    queryKey: qk.gamification.friendsLeaderboard(userId!),
    queryFn: () => getFriendsLeaderboard(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}

/** Fetch monthly leaderboard for a specific month + dimension */
export function useMonthlyLeaderboard(month: string | undefined, dimension: string = 'overall') {
  return useQuery({
    queryKey: qk.gamification.monthlyLeaderboard(month!, dimension),
    queryFn: () => getMonthlyLeaderboard(month!, dimension),
    enabled: !!month,
    staleTime: FIVE_MIN,
  });
}

/**
 * BeScout-Saison ranking (E-2a). `leagueId = null` -> Gesamt (über alle Ligen);
 * UUID -> nur diese Fußball-Liga. `enabled` lässt den Caller den Pro-Liga-Modus
 * ohne gewählte Liga aussetzen (Hinweis statt RPC-Call).
 */
export function useSeasonRanking(leagueId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: qk.gamification.seasonRanking(leagueId),
    queryFn: () => getSeasonRanking(leagueId),
    enabled,
    staleTime: FIVE_MIN,
  });
}

/** Fetch club leaderboard (users following the same club) */
export function useClubLeaderboard(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.gamification.clubLeaderboard(clubId!),
    queryFn: () => getClubLeaderboard(clubId!),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
  });
}
