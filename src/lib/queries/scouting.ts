import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getPlayerScoutingSummaries, getTopScouts, getScoutingStatsForUser, getGlobalTopScouts } from '@/lib/services/scouting';
import { getClubPrestige } from '@/lib/services/club';
import type { PlayerScoutingSummary, TopScout } from '@/types';
import type { ScoutingStats } from '@/lib/services/scouting';
import type { ClubPrestige } from '@/lib/services/club';

export function usePlayerScoutingSummaries(clubId: string | undefined) {
  return useQuery<PlayerScoutingSummary[]>({
    queryKey: qk.scouting.summaries(clubId ?? ''),
    queryFn: () => getPlayerScoutingSummaries(clubId!),
    enabled: !!clubId,
    staleTime: 60_000,
  });
}

export function useTopScouts(clubId: string | undefined, limit = 20) {
  return useQuery<TopScout[]>({
    queryKey: qk.scouting.topScouts(clubId ?? '', limit),
    queryFn: () => getTopScouts(clubId!, limit),
    enabled: !!clubId,
    staleTime: 60_000,
  });
}

export function useScoutingStats(userId: string | undefined) {
  return useQuery<ScoutingStats>({
    queryKey: qk.scouting.userStats(userId ?? ''),
    queryFn: () => getScoutingStatsForUser(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useClubPrestige(clubId: string | undefined) {
  return useQuery<ClubPrestige>({
    queryKey: qk.scouting.prestige(clubId ?? ''),
    queryFn: () => getClubPrestige(clubId!),
    enabled: !!clubId,
    staleTime: 120_000,
  });
}

export function useGlobalTopScouts(limit = 10) {
  return useQuery<TopScout[]>({
    queryKey: qk.scouting.globalTopScouts(limit),
    queryFn: () => getGlobalTopScouts(limit),
    staleTime: 120_000,
  });
}
