'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAirdropScore, getAirdropLeaderboard, getAirdropStats } from '@/lib/services/airdropScore';

const FIVE_MIN = 5 * 60 * 1000;

/** Fetch user's airdrop score */
export function useAirdropScore(userId: string | undefined) {
  return useQuery({
    queryKey: qk.airdrop.score(userId!),
    queryFn: () => getAirdropScore(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}

/** Fetch airdrop leaderboard (top N) */
export function useAirdropLeaderboard(limit: number = 100) {
  return useQuery({
    queryKey: qk.airdrop.leaderboard(limit),
    queryFn: () => getAirdropLeaderboard(limit),
    staleTime: FIVE_MIN,
  });
}

/** Fetch aggregate airdrop stats */
export function useAirdropStats() {
  return useQuery({
    queryKey: qk.airdrop.stats,
    queryFn: () => getAirdropStats(),
    staleTime: FIVE_MIN,
  });
}
