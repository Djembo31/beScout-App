'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAllVotes, getUserVotedIds } from '@/lib/services/votes';

const TWO_MIN = 2 * 60 * 1000;

export function useClubVotes(clubId: string | null) {
  return useQuery({
    queryKey: qk.votes.byClub(clubId!),
    queryFn: () => getAllVotes(clubId!),
    enabled: !!clubId,
    staleTime: TWO_MIN,
  });
}

export function useUserVotedIds(userId: string | undefined) {
  return useQuery<Set<string>>({
    queryKey: qk.clubs.votedIds(userId!),
    queryFn: () => getUserVotedIds(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}
