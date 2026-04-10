'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import {
  getScoutScores,
  getScoreRoadClaims,
  getCurrentLigaSeason,
  getMonthlyLigaWinners,
  getFriendsLeaderboard,
  getMonthlyLeaderboard,
  getClubLeaderboard,
} from '@/lib/services/gamification';

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

/** Fetch monthly Liga winners */
export function useMonthlyLigaWinners(month?: string) {
  return useQuery({
    queryKey: qk.gamification.monthlyWinners(month),
    queryFn: () => getMonthlyLigaWinners(month),
    staleTime: FIVE_MIN,
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

/** Fetch club leaderboard (users following the same club) */
export function useClubLeaderboard(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.gamification.clubLeaderboard(clubId!),
    queryFn: () => getClubLeaderboard(clubId!),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
  });
}
