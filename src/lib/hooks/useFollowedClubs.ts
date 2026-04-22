'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/components/providers/AuthProvider';
import { getUserFollowedClubs } from '@/lib/services/club';
import { qk } from '@/lib/queries/keys';
import type { DbClub } from '@/types';

/**
 * Slice 151b-RESET — Query-Hook fuer die gefolgten Clubs des eingeloggten Users.
 *
 * Ersetzt `ClubProvider.followedClubs`. Query-Cache ist Single Source of Truth;
 * optimistische Updates laufen via `useToggleFollowClub` (setQueryData auf
 * diesen Key + auf `qk.clubs.isFollowing(uid, cid)` + `qk.clubs.followers(cid)`).
 *
 * `getUserFollowedClubs` liefert bereits primary-first sortiert → `data?.[0]`
 * ist bei Bedarf der Primary-Club. Separater Convenience-Hook in
 * `usePrimaryClub.ts`.
 */
export function useFollowedClubs(): {
  data: DbClub[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
} {
  const { user } = useUser();
  const userId = user?.id;

  const query = useQuery<DbClub[], Error>({
    queryKey: userId ? qk.clubs.followedByUser(userId) : ['clubs', 'followedByUser', 'no-user'],
    queryFn: () => getUserFollowedClubs(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
