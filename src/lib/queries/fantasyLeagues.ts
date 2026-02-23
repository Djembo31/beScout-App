import { useQuery } from '@tanstack/react-query';
import { getMyLeagues, getLeagueLeaderboard } from '@/lib/services/fantasyLeagues';
import { qk } from './index';

export function useMyLeagues(userId: string | undefined) {
  return useQuery({
    queryKey: ['fantasy-leagues', userId],
    queryFn: () => getMyLeagues(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useLeagueLeaderboard(leagueId: string | undefined) {
  return useQuery({
    queryKey: ['fantasy-league-leaderboard', leagueId],
    queryFn: () => getLeagueLeaderboard(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });
}
