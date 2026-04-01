import { useQuery } from '@tanstack/react-query';
import { getMyLeagues, getLeagueLeaderboard } from '@/features/fantasy/services/leagues';
import { qk } from '@/lib/queries/keys';

export function useMyLeagues(userId: string | undefined) {
  return useQuery({
    queryKey: qk.fantasyLeagues.byUser(userId),
    queryFn: () => getMyLeagues(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useLeagueLeaderboard(leagueId: string | undefined) {
  return useQuery({
    queryKey: qk.fantasyLeagues.leaderboard(leagueId),
    queryFn: () => getLeagueLeaderboard(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });
}
